<script setup lang="ts">
/**
 * LABB rollgenomgång — går igenom SAMMA PLATSER som spelets stegflöde (docs/STEGFLODE-FORSLAG.md §3.3),
 * ritade i liten skala och animerade med CSS, med exemplet Dana (misstänkt) ur REF_CASE:
 *   1 · MIKROSKOPBORDET  prov (Q1 lyser) → fokus (tummen på reglaget) → sortera (FRYS, Q1, dra till MÄNNISKA)
 *   2 · LJUSBORDET       ljusbord (färgetiketten fäster på håret)
 *   3 · RÖRPOSTEN        misstankta (kapseln dunsar in, Danas polaroid) → matcha (håret på polaroiden → HÅRET MATCHAR)
 *   ★ TAVLAN             slut (båda nålarna på Dana → UTPEKAD)
 * Klickas igenom med NÄSTA/TILLBAKA (+ hörngesten). Texterna under bilden = config.LABB_TUT.
 * Föremålen återanvänder platser.css (pl-bord, pl-pol, pl-stamp, pl-raknare).
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { LABB_TUT, REF_CASE, HAIR_CLASSES, PROV_IDS } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Placeholder from '../components/Placeholder.vue'
import { useHoppa } from '@/station-kit/kiosk/kioskSkip'
import { LABB_TEXT, FARGER } from '../components/platser/labb/labbText'
import '../components/platser/platser.css'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const SCENES = ['prov', 'fokus', 'sortera', 'ljusbord', 'misstankta', 'matcha', 'slut'] as const
type SceneId = (typeof SCENES)[number]
const ix = ref(0)
const scene = computed<SceneId>(() => SCENES[ix.value])
const isLast = computed(() => ix.value >= SCENES.length - 1)

const captions: Record<SceneId, string> = {
  prov: LABB_TUT.prov,
  fokus: LABB_TUT.fokus,
  sortera: LABB_TUT.sort,
  ljusbord: LABB_TUT.ljusbord,
  misstankta: LABB_TUT.misstankta,
  matcha: LABB_TUT.matcha,
  slut: LABB_TUT.slut,
}
const caption = computed(() => captions[scene.value])

/** Platsen varje scen visas på (samma platser och ordning som i spelet). */
type PlatsId = 'mikroskop' | 'ljusbord' | 'rorpost' | 'tavlan'
const PLATS_FOR: Record<SceneId, PlatsId> = {
  prov: 'mikroskop',
  fokus: 'mikroskop',
  sortera: 'mikroskop',
  ljusbord: 'ljusbord',
  misstankta: 'rorpost',
  matcha: 'rorpost',
  slut: 'tavlan',
}
const PLATS_TITEL: Record<PlatsId, string> = {
  mikroskop: '1 · ' + LABB_TEXT.mikroskop.titel,
  ljusbord: '2 · ' + LABB_TEXT.ljusbord.titel,
  rorpost: '3 · ' + LABB_TEXT.rorpost.titel,
  tavlan: '★ TAVLAN',
}
const plats = computed(() => PLATS_FOR[scene.value])

const T = LABB_TEXT
const dana = REF_CASE.dana
const danaF = dana.name.split(' ')[0]
const HAR = REF_CASE.hairImage
const Q = PROV_IDS[0] ?? 'Q1'
/** Etiketten för exempelhåret = Danas hårfärg (blont), så bild, etikett och polaroid hänger ihop. */
const farg = FARGER.find((f) => f.label.toLowerCase() === dana.hair.split(',')[0].trim().toLowerCase()) ?? FARGER[1]

/** Kort uppdragsrad bredvid platsens namn (som i spelet). Sorteringsfrågan står stort. */
const uppdrag = computed(() => {
  switch (scene.value) {
    case 'prov':
    case 'fokus':
      return T.mikroskop.lagg(Q)
    case 'sortera':
      return LABB_TUT.sort_q
    case 'ljusbord':
      return T.ljusbord.uppdrag
    case 'misstankta':
      return T.rorpost.vantar
    case 'matcha':
      return T.rorpost.fraga(danaF)
    default:
      return 'Sätt er nål på den ni tror är tjuven.'
  }
})

/* ------------------------------------------------------------------ *
 * Scenens tidslinje: `fas` räknas upp av timers (0 = start). Scener som
 * loopar startar om, så den som tittar till sent ändå ser handlingen.
 * Med reducerad rörelse hoppar vi direkt till slutläget.
 * ------------------------------------------------------------------ */
const SCHEMA: Record<SceneId, { tider: number[]; loop?: number }> = {
  prov: { tider: [] }, // ren CSS-loop
  fokus: { tider: [] }, // ren CSS-loop
  // 1 FRYST · 2 Q1 väljs · 3 bilden dras · 4 i burken, Q1 ✓
  sortera: { tider: [400, 1100, 1800, 3000], loop: 7000 },
  // 1 etiketten lyfts · 2 etiketten fäster på håret
  ljusbord: { tider: [700, 1500], loop: 5500 },
  // 1 kapseln öppnas, polaroiden fälls ut
  misstankta: { tider: [1000], loop: 6500 },
  // 1 fingret på håret · 2 håret flyger · 3 på polaroiden + HÅRET MATCHAR
  matcha: { tider: [500, 1000, 2200], loop: 7000 },
  // 1 labbets nål · 2 fältets nål · 3 ÖVERENS + UTPEKAD
  slut: { tider: [600, 1300, 2000], loop: 7000 },
}
const lugn = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fas = ref(0)
let timers: number[] = []
function rensa(): void {
  timers.forEach((id) => window.clearTimeout(id))
  timers = []
}
function spela(s: SceneId): void {
  rensa()
  const { tider, loop } = SCHEMA[s]
  if (lugn) {
    fas.value = tider.length
    return
  }
  fas.value = 0
  tider.forEach((ms, i) => timers.push(window.setTimeout(() => (fas.value = i + 1), ms)))
  if (loop) timers.push(window.setTimeout(() => spela(s), loop))
}
watch(scene, (s) => spela(s), { immediate: true })
onBeforeUnmount(rensa)

/* ------------------------------------------------------------------ *
 * Flygande bild (sortera: okular → MÄNNISKA-burken, matcha: håret → polaroiden).
 * Start/mål mäts i bordet ([data-fl="fran"] / [data-fl="till"]), så vägen
 * stämmer både i helskärm och halv bredd.
 * ------------------------------------------------------------------ */
const bordEl = ref<HTMLElement | null>(null)
const flygStil = ref<Record<string, string>>({})
function matFlyg(): void {
  const b = bordEl.value
  const f = b?.querySelector<HTMLElement>('[data-fl="fran"]')
  const m = b?.querySelector<HTMLElement>('[data-fl="till"]')
  if (!b || !f || !m) return
  const rb = b.getBoundingClientRect()
  const rf = f.getBoundingClientRect()
  const rm = m.getBoundingClientRect()
  const fx = rf.left + rf.width / 2 - rb.left
  const fy = rf.top + rf.height / 2 - rb.top
  const mx = rm.left + rm.width / 2 - rb.left
  const my = rm.top + rm.height / 2 - rb.top
  flygStil.value = { left: `${fx}px`, top: `${fy}px`, '--dx': `${mx - fx}px`, '--dy': `${my - fy}px` }
}
// Mät om vid varje steg (billigt) — stilen är klar innan bilden börjar flyga.
watch([scene, fas], () => nextTick(matFlyg), { immediate: true })

/* Mikroskopbordet */
const frozen = computed(() => scene.value === 'sortera' && fas.value >= 1)
const qVald = computed(() => scene.value === 'sortera' && fas.value >= 2)
const flygerSort = computed(() => scene.value === 'sortera' && fas.value === 3)
const iBurken = computed(() => scene.value === 'sortera' && fas.value >= 4)

/* Ljusbordet */
const etikettLyft = computed(() => scene.value === 'ljusbord' && fas.value === 1)
const etikettFast = computed(() => (scene.value === 'ljusbord' && fas.value >= 2) || plats.value === 'rorpost')

/* Rörposten */
const kapselOppen = computed(() => scene.value === 'misstankta' && fas.value >= 1)
const flygerMatch = computed(() => scene.value === 'matcha' && fas.value === 2)
const matchad = computed(() => scene.value === 'matcha' && fas.value >= 3)

/* Tavlan: labbets nål först (det är labbets genomgång), sedan fältets. */
const nalA = computed(() => fas.value >= 1)
const nalB = computed(() => fas.value >= 2)
const overens = computed(() => fas.value >= 3)

/** Glid åt rätt håll mellan platserna (TILLBAKA glider bakåt). */
const glid = ref('pl-glid')
function back(): void {
  if (ix.value > 0) {
    glid.value = 'rt-bak'
    ix.value -= 1
  }
}
function next(): void {
  audio.play('blip')
  if (isLast.value) {
    emit('done')
    return
  }
  glid.value = 'pl-glid'
  ix.value += 1
}
useHoppa(() => next()) // hörngesten (kioskSkip): nästa steg i genomgången
</script>

<template>
  <div class="rt">
    <div class="rt__scen">
      <Transition :name="glid">
        <div :key="plats" class="pl-plats rt__plats">
          <header class="pl-huvud rt__huvud">
            <span class="rt__ogon">LABBET · GENOMGÅNG —</span>
            <h2 class="pl-titel rt__titel">{{ PLATS_TITEL[plats] }}</h2>
            <p class="pl-uppdrag rt__uppdrag" :class="{ 'rt__uppdrag--fraga': scene === 'sortera' }">{{ uppdrag }}</p>
          </header>

          <!-- ============ 1 · MIKROSKOPBORDET ============ -->
          <div v-if="plats === 'mikroskop'" ref="bordEl" :key="scene" class="pl-bord rt__bord mk">
            <!-- Ställningen med provglasen -->
            <aside class="mk__stall">
              <div class="pl-raknare mk__raknare">{{ T.mikroskop.raknare }} <b>{{ iBurken ? 1 : 0 }}</b> av {{ PROV_IDS.length }}</div>
              <div
                v-for="q in PROV_IDS" :key="q" class="mk__glas"
                :class="{ 'mk__glas--klar': q === Q && iBurken, 'mk__glas--nu': (q === Q && !iBurken) || (q === PROV_IDS[1] && iBurken) }"
              >
                <span class="mk__glas-q">{{ q }}</span>
                <svg class="mk__glas-har" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14 Q 40 6 96 8" /></svg>
                <span v-if="q === Q && iBurken" class="mk__glas-ok">✓</span>
              </div>
            </aside>

            <!-- Okularvyn -->
            <div class="mk__okplats">
              <div class="okular" :class="{ 'okular--fryst': frozen }" data-fl="fran">
                <Placeholder
                  class="okular__bild"
                  :class="{ 'okular__bild--prov': scene === 'prov', 'okular__bild--fokus': scene === 'fokus' }"
                  :path="HAR" :label="REF_CASE.hairLabel"
                />
                <span class="okular__vinjett" aria-hidden="true" />
                <span v-if="frozen" class="okular__tag">✓ FRYST</span>

                <!-- Fokus: tummen vrider reglaget -->
                <div v-if="scene === 'fokus'" class="ratt" aria-hidden="true">
                  <svg viewBox="0 0 100 100" class="ratt__yta">
                    <circle cx="50" cy="50" r="46" />
                    <line v-for="d in 12" :key="d" x1="50" y1="6" x2="50" y2="16" :transform="`rotate(${d * 30} 50 50)`" />
                  </svg>
                  <span class="ratt__tumme" />
                  <span class="ratt__text">FOKUS</span>
                </div>

                <!-- Sortera: vilket prov? -->
                <div v-if="frozen" class="okular__q">
                  <span class="okular__q-fraga">{{ T.mikroskop.vilket }}</span>
                  <div class="okular__chips">
                    <span v-for="q in PROV_IDS" :key="q" class="okular__chip" :class="{ 'okular__chip--on': q === Q && qVald }">
                      {{ q }}<span v-if="q === Q && fas === 1" class="rt-tap" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
              <span class="mk__frys" :class="{ 'mk__frys--on': frozen }">
                {{ frozen ? T.mikroskop.tillbaka : T.mikroskop.frys }}
                <span v-if="scene === 'sortera' && fas === 0" class="rt-tap" aria-hidden="true" />
              </span>
            </div>

            <!-- Burkarna -->
            <div class="mk__burkar">
              <div
                v-for="c in HAIR_CLASSES" :key="c.id" class="burk"
                :class="{ 'burk--over': c.id === 'manniska' && (flygerSort || iBurken) }"
                :data-fl="c.id === 'manniska' ? 'till' : undefined"
              >
                <span class="burk__etikett">{{ T.burk[c.id] }}</span>
                <div class="burk__inne">
                  <span v-if="c.id === 'manniska' && iBurken" class="burk__tumme">
                    <Placeholder :path="HAR" label="" />
                    <span class="burk__tumme-q">{{ Q }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Bilden dras från okularet ner i MÄNNISKA-burken -->
            <div v-if="flygerSort" class="flyg" :style="flygStil" aria-hidden="true">
              <Placeholder :path="HAR" label="" />
              <span class="flyg__q">{{ Q }}</span>
              <span class="rt-tap rt-tap--still" />
            </div>
          </div>

          <!-- ============ 2 · LJUSBORDET ============ -->
          <div v-else-if="plats === 'ljusbord'" ref="bordEl" :key="scene" class="pl-bord rt__bord lj">
            <section class="lj__ljus">
              <div class="harkort">
                <span class="harkort__q">{{ Q }}</span>
                <Placeholder class="harkort__bild" :path="HAR" :label="REF_CASE.hairLabel" />
                <span v-if="etikettFast" class="etikett etikett--fast"><i :style="{ background: farg.prick }" />{{ farg.label }}</span>
                <span v-else class="harkort__farg">{{ T.ljusbord.farg }}</span>
              </div>
              <span class="pl-raknare lj__raknare">{{ T.ljusbord.raknare }}: <b>{{ etikettFast ? 1 : 0 }}</b> av 1</span>
            </section>
            <section class="lj__ark">
              <span class="lj__ark-rubrik">{{ T.ljusbord.ark }}</span>
              <div class="lj__ark-grid">
                <span
                  v-for="f in FARGER" :key="f.id" class="etikett"
                  :class="{ 'etikett--lyft': f.id === farg.id && etikettLyft, 'etikett--borta': f.id === farg.id && etikettFast }"
                >
                  <i :style="{ background: f.prick }" />{{ f.label }}
                  <span v-if="f.id === farg.id && fas === 0" class="rt-tap" aria-hidden="true" />
                </span>
              </div>
            </section>
          </div>

          <!-- ============ 3 · RÖRPOSTEN ============ -->
          <div v-else-if="plats === 'rorpost'" ref="bordEl" :key="scene" class="pl-bord rt__bord rp">
            <!-- Rörpostens utkast i högerkanten (mot fältet) -->
            <div class="ror" aria-hidden="true"><span class="ror__mun" /></div>

            <!-- Etiketterade hår (från ljusbordet) -->
            <section class="rp__har">
              <div class="harkort harkort--liten" :class="{ 'harkort--vald': scene === 'matcha' && fas >= 1 && fas < 3 }">
                <span class="harkort__q">{{ Q }}</span>
                <Placeholder class="harkort__bild" :path="HAR" :label="REF_CASE.hairLabel" data-fl="fran" />
                <span class="etikett etikett--fast"><i :style="{ background: farg.prick }" />{{ farg.label }}</span>
                <span v-if="scene === 'matcha' && fas === 0" class="rt-tap" aria-hidden="true" />
              </div>
            </section>

            <!-- Polaroiden på bordet (matcha) -->
            <section class="rp__bord">
              <div v-if="scene === 'matcha'" class="pl-pol rp__pol" data-fl="till">
                <Placeholder :path="dana.image" :label="dana.name" />
                <span class="pl-pol__cap">{{ dana.name.toUpperCase() }}</span>
                <span v-if="matchad" class="rp__lagd"><Placeholder :path="HAR" label="" /></span>
                <span v-if="matchad" class="pl-stamp pl-stamp--or pl-stamp--in rp__stamp">{{ T.rorpost.stampel }}</span>
              </div>

            </section>

            <!-- Håret läggs på polaroiden -->
            <div v-if="flygerMatch" class="flyg flyg--match" :style="flygStil" aria-hidden="true">
              <Placeholder :path="HAR" label="" />
              <span class="flyg__q">{{ Q }}</span>
            </div>

            <!-- Ankomsten: kapseln dunsar in, Danas polaroid fälls ut -->
            <div v-if="scene === 'misstankta'" class="ank" :class="{ 'ank--oppen': kapselOppen }" aria-live="polite">
              <div class="ank__dimma" />
              <p class="ank__rubrik">{{ T.ankomst.rubrik }}</p>
              <div class="ank__kapsel"><span class="ank__lock" /></div>
              <div class="pl-pol ank__pol">
                <Placeholder :path="dana.image" :label="dana.name" />
                <span class="pl-pol__cap">{{ dana.name.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <!-- ============ ★ TAVLAN ============ -->
          <div v-else :key="scene" class="pl-bord rt__bord tv">
            <div class="tv__band" :class="{ 'tv__band--overens': overens }">
              <span class="tv__band-stor">{{ overens ? `NI ÄR ÖVERENS: ${dana.name.toUpperCase()}` : '★ VEM ÄR TJUVEN?' }}</span>
            </div>
            <div class="tv__kork">
              <div class="pl-pol tv__kort tv__kort--min">
                <Placeholder :path="dana.image" :label="dana.name" />
                <span class="pl-pol__cap">{{ dana.name.toUpperCase() }}</span>
                <span class="tv__nalar">
                  <span v-if="nalA" class="tv__nal tv__nal--a" title="Labbets nål" />
                  <span v-if="nalB" class="tv__nal tv__nal--b" title="Fältets nål" />
                </span>
                <span class="tv__notis mono"><b>✓ håret matchar</b></span>
                <span v-if="overens" class="pl-stamp pl-stamp--or pl-stamp--in tv__utpekad">UTPEKAD</span>
              </div>
            </div>
            <div class="tv__fot">
              <span class="tv__legend"><span class="tv__nal tv__nal--a" /> LABBET (sida A) — ni</span>
              <span class="tv__legend"><span class="tv__nal tv__nal--b" /> FÄLTET (sida B)</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <p class="rt__caption">{{ caption }}</p>
    <div class="rt__dots">
      <span v-for="(s, i) in SCENES" :key="s" class="rt__dot" :class="{ 'rt__dot--on': i <= ix }" />
    </div>
    <div class="rt__nav">
      <button v-if="ix > 0" class="crt-button rt__btn rt__btn--back" @click="back">◂ {{ t('onboarding.back') }}</button>
      <button class="crt-button crt-button--strong rt__btn" @click="next">
        {{ isLast ? t('onboarding.go_live') : t('onboarding.next') }} ▸
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ===== Ramen: platsen överst, caption + prickar + knappar under ===== */
.rt {
  container: rt / inline-size; align-self: stretch; width: 100%; flex: 1 1 auto; height: 100%; min-height: 0;
  display: flex; flex-direction: column; align-items: center; gap: clamp(0.35rem, 1.1vh, 0.8rem);
  padding: clamp(0.3rem, 1vh, 0.8rem); text-align: center;
}
.rt__scen { position: relative; flex: 1 1 auto; min-height: 0; width: 100%; display: flex; flex-direction: column; overflow: hidden; }
.rt__plats { flex: 1 1 auto; height: auto; text-align: left; }
.rt__huvud { flex-wrap: wrap; row-gap: 0.1rem; column-gap: 0.7rem; }
.rt__ogon { font-family: var(--font-mono); font-size: clamp(0.8rem, 1.6cqi, 1.05rem); letter-spacing: 0.12em; color: var(--color-ink-muted); white-space: nowrap; }
.rt__titel { white-space: nowrap; font-size: clamp(1.3rem, 3.4cqi, 2.4rem); }
.rt__uppdrag { min-width: 0; }
.rt__uppdrag--fraga { flex-basis: 100%; font-family: var(--font-retro); font-size: clamp(1.3rem, 3.6cqi, 2.4rem); color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.rt__bord { container: bord / size; }

.rt__caption { margin: 0; font-family: var(--font-mono); font-size: clamp(1.05rem, 2.4cqi, 1.55rem); line-height: 1.35; color: var(--color-ink-strong); max-width: 56ch; min-height: 2.7em; }
.rt__dots { display: flex; gap: 0.5rem; }
.rt__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.rt__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.rt__nav { display: flex; gap: 0.8rem; justify-content: center; align-items: center; flex-wrap: wrap; }
.rt__btn { font-size: clamp(1.05rem, 2.2cqi, 1.35rem); padding: 0.6em 1.5em; }
.rt__btn--back { opacity: 0.85; }

/* TILLBAKA: bordet glider in från vänster */
.rt-bak-enter-active, .rt-bak-leave-active { transition: transform 650ms cubic-bezier(0.65, 0, 0.35, 1), opacity 650ms; }
.rt-bak-enter-from { transform: translateX(-100%); opacity: 0.4; }
.rt-bak-leave-to { transform: translateX(100%); opacity: 0.4; }
.rt-bak-leave-active { position: absolute; inset: 0; }

/* Bilder: Placeholder utan egen ram */
.rt :deep(.ph) { border: 0; border-radius: 0; box-shadow: none; background: #111; width: 100%; }

/* Fingret (tryck-prick) */
.rt-tap {
  position: absolute; right: -0.5rem; bottom: -0.5rem; z-index: 6; width: 1.3rem; height: 1.3rem; border-radius: 50%;
  background: rgba(255, 255, 255, 0.9); box-shadow: 0 0 0 7px rgba(var(--mode-accent-rgb), 0.35); animation: rt-tap 0.9s ease-in-out infinite;
}
.rt-tap--still { animation: none; }
@keyframes rt-tap { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.65); } }

/* Flygande bild (start/mål mätta i bordet) */
.flyg {
  position: absolute; z-index: 8; width: clamp(3.2rem, 10cqi, 5.5rem); translate: -50% -50%; pointer-events: none;
  border: 3px solid #efe9da; border-radius: 4px; background: #000; box-shadow: var(--glow-strong); rotate: -4deg;
  animation: rt-flyg 1150ms cubic-bezier(0.45, 0, 0.3, 1) both;
}
.flyg__q { position: absolute; left: 0; bottom: 0; padding: 0 0.3em; background: #efe9da; color: #1d1d1d; font-family: var(--font-mono); font-weight: 600; font-size: 0.75rem; }
@keyframes rt-flyg {
  0% { transform: none; opacity: 0; }
  12% { transform: translateY(-6px) scale(1.06); opacity: 1; }
  88% { transform: translate(var(--dx), var(--dy)) scale(0.85); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.7); opacity: 0; }
}

/* ============ 1 · MIKROSKOPBORDET ============ */
.mk {
  display: grid; grid-template-columns: minmax(6.5rem, 0.62fr) minmax(0, 1.25fr) minmax(0, 1.3fr);
  gap: clamp(0.6rem, 2cqi, 1.6rem); padding: clamp(0.6rem, 2cqi, 1.3rem);
}
.mk__stall {
  display: flex; flex-direction: column; gap: clamp(0.25rem, 1.4cqh, 0.6rem); min-height: 0; padding: 0.6rem;
  background: rgba(0, 0, 0, 0.22); border: 2px solid rgba(255, 210, 160, 0.12); border-radius: 10px;
}
.mk__raknare { font-size: clamp(0.95rem, 2.4cqi, 1.6rem); white-space: nowrap; }
.mk__glas {
  position: relative; flex: 1; min-height: 1.6rem; max-height: 3.6rem; display: flex; align-items: center; gap: 0.4rem; padding: 0 0.5rem;
  border-radius: 5px; border: 2px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(180deg, rgba(220, 230, 235, 0.22), rgba(160, 175, 180, 0.12)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.mk__glas-q { font-family: var(--font-retro); font-size: clamp(0.9rem, 2.2cqi, 1.5rem); color: var(--color-ink-strong); }
.mk__glas-har { flex: 1; height: 0.8rem; fill: none; stroke: rgba(30, 20, 15, 0.65); stroke-width: 2; }
.mk__glas-ok { font-family: var(--font-retro); font-size: clamp(0.9rem, 2.2cqi, 1.5rem); color: var(--color-primary); }
.mk__glas--klar { opacity: 0.72; }
.mk__glas--nu { opacity: 1; border-color: var(--color-primary); box-shadow: var(--glow-soft); animation: mk-puls 1.6s ease-in-out infinite; }
@keyframes mk-puls { 50% { box-shadow: var(--glow-strong); } }

.mk__okplats { min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(0.4rem, 2cqh, 0.9rem); }
.okular {
  position: relative; width: min(100%, 74cqh); aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: #000;
  border: 6px solid #2a2d30; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06), 0 12px 26px rgba(0, 0, 0, 0.6);
  transition: box-shadow 200ms ease;
}
.okular--fryst { box-shadow: 0 0 0 3px var(--color-primary), var(--glow-strong); }
.okular__bild { position: absolute; inset: 0; height: 100%; aspect-ratio: auto; }
.okular__bild :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.okular__bild--prov { filter: blur(5px) brightness(0.55); animation: ok-tand 3s ease-in-out infinite; }
.okular__bild--fokus { animation: ok-fokus 2.6s ease-in-out infinite; }
@keyframes ok-tand { 50% { filter: blur(5px) brightness(0.85); } }
@keyframes ok-fokus { 0%, 100% { filter: blur(7px); } 45%, 55% { filter: blur(0); } }
.okular__vinjett { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle, transparent 55%, rgba(0, 0, 0, 0.85) 72%); }
.okular__tag {
  position: absolute; top: 14%; left: 50%; translate: -50% 0; padding: 0.1em 0.5em; border-radius: 5px; background: rgba(2, 6, 4, 0.75);
  font-family: var(--font-mono); font-size: clamp(0.7rem, 1.6cqi, 0.95rem); letter-spacing: 0.08em; color: var(--color-primary);
}
.okular__q {
  position: absolute; left: 50%; bottom: 12%; translate: -50% 0; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.3rem 0.5rem; border-radius: 10px; background: rgba(2, 6, 4, 0.8);
}
.okular__q-fraga { font-family: var(--font-retro); font-size: clamp(0.75rem, 1.8cqi, 1.1rem); color: var(--color-ink-strong); }
.okular__chips { display: grid; grid-template-columns: repeat(3, auto); gap: 0.2rem; }
.okular__chip {
  position: relative; font-family: var(--font-retro); font-size: clamp(0.7rem, 1.6cqi, 1rem); min-width: 2.4em; padding: 0.05em 0.3em; text-align: center;
  color: var(--color-ink-muted); background: var(--color-background-2); border: 2px solid var(--color-primary-dim); border-radius: 6px;
}
.okular__chip--on { color: #120c06; background: var(--color-primary); border-color: var(--color-primary); }
.okular__chip .rt-tap { width: 1rem; height: 1rem; }

.ratt { position: absolute; right: 14%; bottom: 20%; width: 28%; aspect-ratio: 1; }
.ratt__yta { width: 100%; height: 100%; fill: rgba(2, 6, 4, 0.55); stroke: var(--color-primary); stroke-width: 2; animation: ratt-vrid 2.6s ease-in-out infinite; transform-origin: center; }
.ratt__yta line { stroke: var(--color-primary-dim); stroke-width: 3; stroke-linecap: round; }
.ratt__tumme {
  position: absolute; top: 6%; left: 50%; width: 28%; height: 36%; border: 1px solid var(--color-primary); border-radius: 50% 50% 46% 46%;
  background: radial-gradient(circle at 40% 35%, rgba(var(--mode-accent-rgb), 0.9), rgba(var(--mode-accent-rgb), 0.35));
  transform-origin: center 150%; animation: ratt-tumme 2.6s ease-in-out infinite; box-shadow: var(--glow-soft);
}
.ratt__text { position: absolute; bottom: -1.2rem; left: 0; right: 0; text-align: center; font-family: var(--font-mono); letter-spacing: 0.14em; font-size: 0.7rem; color: var(--color-primary); }
@keyframes ratt-vrid { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
@keyframes ratt-tumme { 0%, 100% { transform: translateX(-50%) rotate(-16deg); } 50% { transform: translateX(-50%) rotate(16deg); } }

.mk__frys {
  position: relative; flex: none; padding: 0.35em 1.2em; border: 2px solid var(--color-primary-dim); border-radius: 10px; background: var(--color-background-2);
  font-family: var(--font-retro); font-size: clamp(0.85rem, 2cqi, 1.25rem); letter-spacing: 0.04em; color: var(--color-ink-muted);
}
.mk__frys--on { color: var(--color-ink-strong); border-color: var(--color-primary); }

.mk__burkar { min-width: 0; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(0.35rem, 1.2cqi, 0.9rem); align-items: end; }
.burk {
  position: relative; height: min(100%, 70cqh); min-height: 6rem; display: flex; flex-direction: column; align-items: center;
  padding: 1rem 0.3rem 0.4rem; border: 3px solid rgba(220, 235, 240, 0.32); border-top-width: 6px; border-radius: 6px 6px 22px 22px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 40%, rgba(255, 255, 255, 0.08));
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.burk--over { border-color: var(--color-primary); box-shadow: var(--glow-strong); transform: scale(1.03); }
.burk__etikett {
  max-width: 100%; padding: 0.2em 0.45em; background: #efe9da; color: #1d1d1d; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
  font-family: var(--font-retro); font-size: clamp(0.65rem, 1.7cqi, 1.1rem); letter-spacing: 0.03em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.burk__inne { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 0.3rem; }
.burk__tumme { position: relative; width: 70%; max-width: 4.6rem; border: 2px solid #efe9da; border-radius: 3px; overflow: hidden; animation: burk-in 260ms ease-out both; }
.burk__tumme-q { position: absolute; left: 0; bottom: 0; padding: 0 0.25em; background: #efe9da; color: #1d1d1d; font-family: var(--font-mono); font-weight: 600; font-size: 0.65rem; }
@keyframes burk-in { from { opacity: 0; transform: scale(0.8) translateY(-10px); } }

@container rt (max-width: 760px) {
  .mk { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .mk__stall { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; padding: 0.35rem 0.5rem; }
  .mk__raknare { flex-basis: 100%; }
  .mk__glas { flex: 1 1 3.2rem; min-height: 1.8rem; }
  .mk__glas-har { display: none; }
  .okular { width: min(100%, 58cqh); }
  .burk { height: min(100%, 52cqh); }
}

/* ============ 2 · LJUSBORDET ============ */
.lj { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: clamp(0.6rem, 2cqi, 1.6rem); padding: clamp(0.6rem, 2cqi, 1.3rem); }
.lj__ljus {
  min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.7rem; padding: clamp(0.6rem, 2cqi, 1.2rem);
  border-radius: 10px; border: 8px solid #3a3d3e; background-color: #dfe9e6;
  background-image: linear-gradient(rgba(60, 90, 85, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(60, 90, 85, 0.12) 1px, transparent 1px);
  background-size: 24px 24px; box-shadow: 0 0 40px rgba(220, 240, 235, 0.18), inset 0 0 30px rgba(255, 255, 255, 0.6);
}
.lj__raknare { color: #1d1d1d; font-size: clamp(1rem, 2.6cqi, 1.8rem); }
.harkort { position: relative; width: min(100%, 22rem, 62cqh); display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.4rem; border: 3px solid transparent; border-radius: 10px; }
.harkort__q { align-self: flex-start; font-family: var(--font-retro); font-size: clamp(1rem, 2.4cqi, 1.6rem); color: #1d1d1d; }
.harkort__bild { border: 3px solid #1d1d1d !important; }
.harkort__farg {
  padding: 0.25em 1.1em; border: 2px dashed rgba(29, 29, 29, 0.45); border-radius: 6px;
  font-family: var(--font-mono); font-size: clamp(0.8rem, 1.8cqi, 1.1rem); color: rgba(29, 29, 29, 0.6);
}
.harkort--vald { border-color: var(--color-primary); box-shadow: var(--glow-soft); }

.etikett {
  position: relative; display: inline-flex; align-items: center; gap: 0.5em; padding: 0.3em 0.8em;
  font-family: var(--font-retro); font-size: clamp(0.85rem, 2cqi, 1.4rem); letter-spacing: 0.03em; color: #1d1d1d;
  background: #efe9da; border: 2px solid transparent; border-radius: 4px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s, border-color 0.2s, opacity 0.2s, box-shadow 0.2s;
}
.etikett i { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; }
.etikett--lyft { border-color: var(--color-primary); transform: translateY(-6px) rotate(-3deg); box-shadow: var(--glow-strong); }
.etikett--borta { opacity: 0.25; }
.etikett--fast { animation: et-fast 280ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
@keyframes et-fast { from { opacity: 0; transform: scale(1.5) rotate(-8deg); } }

.lj__ark { min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.6rem; }
.lj__ark-rubrik { font-family: var(--font-mono); font-weight: 600; letter-spacing: 0.14em; font-size: clamp(0.75rem, 1.6cqi, 1rem); color: var(--color-primary); }
.lj__ark-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }

@container rt (max-width: 760px) {
  .lj { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1.5fr) auto; }
  .lj__ark-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lj__ark-grid .etikett { padding: 0.3em 0.4em; justify-content: center; }
}

/* ============ 3 · RÖRPOSTEN ============ */
.rp {
  display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: clamp(0.6rem, 2.4cqi, 1.6rem); align-items: center;
  padding: clamp(0.6rem, 2cqi, 1.2rem) clamp(2.8rem, 6cqi, 4.2rem) clamp(0.6rem, 2cqi, 1.2rem) clamp(0.6rem, 2cqi, 1.2rem);
}
.ror {
  position: absolute; right: -4px; top: 30%; z-index: 3; width: clamp(1.9rem, 4cqi, 2.8rem); height: clamp(5rem, 30cqh, 8.5rem);
  border-radius: 999px 0 0 999px; background: linear-gradient(270deg, #5e3f12, #b98a35 35%, #f1d38c 52%, #c9973e 70%, #6f4c18);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55), inset 0 0 0 2px rgba(60, 38, 8, 0.6);
}
.ror__mun { position: absolute; left: 18%; top: 14%; bottom: 14%; width: 42%; border-radius: 999px; background: radial-gradient(ellipse at 60% 50%, #050302, #1c1207 70%, #3a2709); box-shadow: inset -2px 0 6px rgba(0, 0, 0, 0.9); }
.rp__har {
  min-height: 0; height: 100%; display: flex; align-items: center; justify-content: center; padding: 0.6rem; border-radius: 10px;
  border: 6px solid #3a3d3e; background-color: #dfe9e6;
  background-image: linear-gradient(rgba(60, 90, 85, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(60, 90, 85, 0.12) 1px, transparent 1px);
  background-size: 22px 22px;
}
.harkort--liten { width: min(100%, 16rem, 52cqh); }
.rp__bord { min-height: 0; height: 100%; display: flex; align-items: center; justify-content: center; }
.rp__pol { width: min(100%, 64cqh); rotate: -2deg; }
.rp__lagd { position: absolute; right: -6%; bottom: 18%; width: 34%; border: 3px solid #1d1d1d; rotate: 8deg; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5); animation: burk-in 260ms ease-out both; }
.rp__stamp { left: 6%; top: 28%; font-size: clamp(1rem, 3.2cqi, 2rem); }

/* Ankomsten (spelets RorpostAnkomst i liten skala) */
.ank { position: absolute; inset: 0; z-index: 10; overflow: hidden; container-type: size; }
.ank__dimma { position: absolute; inset: 0; background: rgba(2, 5, 4, 0.82); animation: ank-tona 300ms ease-out both; }
@keyframes ank-tona { from { opacity: 0; } }
.ank__rubrik {
  position: absolute; left: 0; right: 0; top: 6%; margin: 0; padding: 0 0.6rem; text-align: center; z-index: 2;
  font-family: var(--font-retro); font-size: clamp(1.1rem, 5cqw, 2.6rem); letter-spacing: 0.03em; color: var(--color-ink-strong); text-shadow: var(--glow-strong);
  opacity: 0; transition: opacity 300ms ease;
}
.ank--oppen .ank__rubrik { opacity: 1; }
.ank__kapsel {
  position: absolute; right: 7%; top: 46%; width: clamp(5rem, 22cqw, 11rem); height: clamp(2rem, 8cqw, 4rem); z-index: 2;
  border-radius: 999px; background: linear-gradient(180deg, #fbe7a4, #d8b45a 45%, #8a6a2a);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: ank-duns 700ms cubic-bezier(0.3, 0, 0.6, 1) both;
}
.ank__lock { position: absolute; left: 0; top: 0; bottom: 0; width: 26%; border-radius: 999px 0 0 999px; background: linear-gradient(180deg, #e8cf86, #b8913f 50%, #6f521b); border-right: 3px solid #4a3612; }
@keyframes ank-duns {
  0% { transform: translate(120%, 0) rotate(-12deg); }
  70% { transform: translate(0, 0) rotate(-4deg); }
  82% { transform: translate(-4%, -9%) rotate(-2deg); }
  100% { transform: translate(0, 0) rotate(-4deg); }
}
.ank--oppen .ank__kapsel { animation: ank-oppna 450ms ease-in both; }
.ank--oppen .ank__lock { animation: ank-lock 450ms ease-out both; }
@keyframes ank-oppna { from { transform: rotate(-4deg); } to { opacity: 0.25; transform: rotate(-4deg) scale(0.85); } }
@keyframes ank-lock { to { transform: translate(-160%, -60%) rotate(-50deg); opacity: 0; } }
.ank__pol { position: absolute; left: 50%; top: 56%; width: min(46cqw, 56cqh); z-index: 3; translate: -50% -50%; opacity: 0; }
.ank--oppen .ank__pol { opacity: 1; rotate: -2deg; animation: ank-fall-ut 520ms cubic-bezier(0.2, 1.3, 0.4, 1) both; }
@keyframes ank-fall-ut { from { opacity: 0; transform: translate(30cqw, -4cqh) scale(0.15) rotate(25deg); } to { opacity: 1; transform: none; } }

@container rt (max-width: 760px) {
  .rp { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
  .rp__pol { width: min(90%, 50cqh); }
}

/* ============ ★ TAVLAN ============ */
.tv { display: flex; flex-direction: column; gap: 0.5rem; padding: clamp(0.5rem, 1.6cqi, 1rem); background-color: var(--color-background-2); background-image: none; }
.tv__band { flex: none; display: flex; align-items: center; justify-content: center; padding: 0.4rem 0.8rem; border: 2px solid var(--color-primary-dim); border-radius: 10px; background: var(--color-background); transition: border-color 250ms, background 250ms; }
.tv__band--overens { border-color: #7ad14f; background: rgba(122, 209, 79, 0.12); }
.tv__band-stor { font-family: var(--font-retro); font-size: clamp(1.1rem, 3.2cqi, 2.2rem); letter-spacing: 0.05em; color: var(--color-ink-strong); }
.tv__kork {
  flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 1.4rem 1rem 2rem;
  border-radius: 12px; border: 2px solid var(--color-primary-dim); background-color: #b78a55;
  background-image: radial-gradient(rgba(90, 55, 20, 0.35) 1px, transparent 1.6px), radial-gradient(rgba(255, 235, 200, 0.18) 1px, transparent 1.6px);
  background-size: 9px 9px, 13px 13px;
}
.tv__kort { width: min(34cqi, 48cqh); rotate: -1.5deg; }
.tv__kort--min { box-shadow: 0 0 0 4px var(--color-primary), 0 10px 22px rgba(0, 0, 0, 0.55); }
.tv__nalar { position: absolute; top: -0.9rem; left: 50%; translate: -50% 0; display: flex; gap: 0.2rem; }
.tv__nal { display: inline-block; width: 1.7rem; height: 1.7rem; border-radius: 50%; box-shadow: 2px 5px 6px rgba(0, 0, 0, 0.5), inset -4px -4px 0 rgba(0, 0, 0, 0.15); vertical-align: middle; }
.tv__nalar .tv__nal { animation: tv-nal 260ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.tv__nal--a { background: #fff1d6; }
.tv__nal--b { background: #ff3cc8; }
.tv__notis { position: absolute; left: 0; right: 0; top: 100%; margin-top: 0.3rem; font-size: clamp(0.75rem, 1.6cqi, 1rem); color: #1d1d1d; text-align: center; }
.tv__notis b { color: #8a3d00; }
.tv__utpekad { left: 8%; top: 32%; font-size: clamp(1.1rem, 3.6cqi, 2.4rem); }
.tv__fot { flex: none; display: flex; justify-content: center; gap: 1.4rem; flex-wrap: wrap; font-family: var(--font-mono); color: var(--color-ink-muted); }
.tv__legend { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(0.8rem, 1.6cqi, 1.05rem); }
.tv__legend .tv__nal { width: 1rem; height: 1rem; }
@keyframes tv-nal { from { transform: translateY(-18px) scale(1.5); opacity: 0; } to { transform: none; opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .rt-tap, .flyg, .mk__glas--nu, .okular__bild--prov, .okular__bild--fokus, .ratt__yta, .ratt__tumme, .burk__tumme,
  .etikett--fast, .rp__lagd, .ank__dimma, .ank__kapsel, .ank__lock, .ank__pol, .tv__nalar .tv__nal { animation: none !important; }
  .okular__bild--fokus { filter: none; }
  .ank__kapsel { opacity: 0.25; }
}
</style>
