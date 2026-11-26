<script setup lang="ts">
/**
 * FÄLT rollgenomgång — går igenom SAMMA PLATSER som spelets stegflöde (docs/STEGFLODE-FORSLAG.md §3.2),
 * ritade i liten skala och animerade med CSS, med exemplet Dana (misstänkt) + Nils (avskriven) ur REF_CASE:
 *   1 · BROTTSPLATSEN      lys (UV-pennan tänder avtrycket) → skanna (påsen fylls: Dana)
 *   2 · UTREDNINGSBORDET   koppla (röda pennan ringar in raden) → markera (MISSTÄNKT → rörposten, Nils AVSKRIVEN)
 *   ★ TAVLAN               slut (båda nålarna på Dana → UTPEKAD)
 * Klickas igenom med NÄSTA/TILLBAKA (+ hörngesten). Texterna under bilden = config.FALT_TUT.
 * Föremålen återanvänder platser.css (pl-bord, pl-pol, pl-stamp, pl-papper, pl-penna, pl-raknare).
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { FALT_TUT, REF_CASE } from '@/config'
import { klippKlader } from '../logg/logg'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Placeholder from '../components/Placeholder.vue'
import { useHoppa } from '@/station-kit/kiosk/kioskSkip'
import { FALT_TEXT, fornamn } from '../components/platser/falt/faltText'
import '../components/platser/platser.css'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const SCENES = ['lys', 'skanna', 'koppla', 'markera', 'slut'] as const
type SceneId = (typeof SCENES)[number]
const ix = ref(0)
const scene = computed<SceneId>(() => SCENES[ix.value])
const isLast = computed(() => ix.value >= SCENES.length - 1)

const captions: Record<SceneId, string> = {
  lys: FALT_TUT.lys,
  skanna: FALT_TUT.skanna,
  koppla: FALT_TUT.koppla,
  markera: FALT_TUT.markera,
  slut: FALT_TUT.slut,
}
const caption = computed(() => captions[scene.value])

/** Platsen varje scen visas på (samma platser och ordning som i spelet). */
type PlatsId = 'brott' | 'utredning' | 'tavlan'
const PLATS_FOR: Record<SceneId, PlatsId> = {
  lys: 'brott',
  skanna: 'brott',
  koppla: 'utredning',
  markera: 'utredning',
  slut: 'tavlan',
}
const PLATS_TITEL: Record<PlatsId, string> = {
  brott: FALT_TEXT.brott.titel,
  utredning: FALT_TEXT.utredning.titel,
  tavlan: '★ TAVLAN',
}
const plats = computed(() => PLATS_FOR[scene.value])

const dana = REF_CASE.dana
const nils = REF_CASE.nils
const danaF = fornamn(dana.name)
const nilsF = fornamn(nils.name)
const U = FALT_TEXT.utredning
const B = FALT_TEXT.brott

/** Kort uppdragsrad bredvid platsens namn (som i spelet). */
const uppdrag = computed(() => {
  switch (scene.value) {
    case 'lys':
      return B.gor1
    case 'skanna':
      return B.gor2
    case 'koppla':
      return U.kopplaFraga(danaF)
    case 'markera':
      return U.bedomFraga(fas.value >= 3 ? nilsF : danaF)
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
  lys: { tider: [] }, // ren CSS-loop
  // 1 skannern in · 2 skannar · 3 påsen landar + IDENTIFIERAD · 4 skannern bort · 5 raden tonar
  skanna: { tider: [80, 850, 1500, 2300, 5600], loop: 8000 },
  // 1 fingret på raden · 2 pennan ringar in · 3 "Kopplat: 02:14"
  koppla: { tider: [700, 1300, 2200], loop: 6500 },
  // 1 MISSTÄNKT · 2 in i rörposten · 3 Nils fram · 4 AVSKRIVEN
  markera: { tider: [700, 1800, 3000, 3900], loop: 7500 },
  // 1 fältets nål · 2 labbets nål · 3 ÖVERENS + UTPEKAD
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

/* Brottsplatsen */
const PASAR = 9
const pasFylld = computed(() => scene.value === 'skanna' && fas.value >= 3)
const idSyns = computed(() => scene.value === 'skanna' && fas.value >= 3 && fas.value < 5)

/* Utredningsbordet: övningsfallets logg på pappersarket; klädorden understrukna. */
const refLogg = REF_CASE.log.map((e) => ({ ...e, bitar: klippKlader(e.text) }))
const ringRad = refLogg.findIndex((e) => e.circle)
const kopplatTid = refLogg[ringRad]?.time ?? ''
/** Inringningen syns: ritas i koppla (fas 2), ligger kvar i markera. */
const ringSyns = computed(() => (scene.value === 'koppla' && fas.value >= 2) || scene.value === 'markera')
/** Personen på bordet just nu. */
const paBordet = computed(() => (scene.value === 'markera' && fas.value >= 3 ? 'nils' : 'dana'))
const danaStamplad = computed(() => scene.value === 'markera' && fas.value >= 1)
const nilsStamplad = computed(() => scene.value === 'markera' && fas.value >= 4)
const suger = computed(() => scene.value === 'markera' && fas.value === 2)

/* Tavlan: fältets nål först (det är fältets genomgång), sedan labbets. */
const nalB = computed(() => fas.value >= 1)
const nalA = computed(() => fas.value >= 2)
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
            <span class="rt__ogon">FÄLTET · GENOMGÅNG —</span>
            <h2 class="pl-titel rt__titel">{{ PLATS_TITEL[plats] }}</h2>
            <p class="pl-uppdrag rt__uppdrag">{{ uppdrag }}</p>
          </header>

          <!-- ============ 1 · BROTTSPLATSEN ============ -->
          <div v-if="plats === 'brott'" :key="scene" class="pl-bord rt__bord br">
            <!-- Ytan: UV-pennan sveper (lys) / skannern läser avtrycket (skanna) -->
            <svg class="br__yta" viewBox="0 0 400 160" aria-hidden="true">
              <defs>
                <linearGradient id="rt-falt-uv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#b47cff" stop-opacity="0.85" />
                  <stop offset="1" stop-color="#7a3cff" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <rect class="br__ytan" x="10" y="98" width="380" height="54" rx="8" />
              <g
                class="br__fp" transform="translate(250 126)"
                :class="{ 'br__fp--lys': scene === 'lys', 'br__fp--tand': scene === 'skanna' }"
              >
                <path d="M -4 7 A 4 4 0 0 1 4 7" />
                <path d="M -8 9 A 8 8 0 0 1 8 9" />
                <path d="M -12 10 A 12 12 0 0 1 12 10" />
                <path d="M -16 11 A 16 16 0 0 1 16 11" />
                <path d="M -19 12 A 19 18 0 0 1 19 12" />
              </g>

              <g v-if="scene === 'lys'" class="br__penna">
                <polygon points="100,44 68,128 132,128" fill="url(#rt-falt-uv)" />
                <line class="br__penna-kropp" x1="44" y1="10" x2="96" y2="40" />
                <circle class="br__penna-spets" cx="100" cy="44" r="5" />
              </g>

              <template v-else>
                <circle class="br__ring" :class="{ 'br__ring--on': fas === 2 }" cx="250" cy="130" r="12" />
                <g class="br__sk" :class="{ 'br__sk--in': fas >= 1 && fas < 4 }">
                  <rect class="br__sk-kropp" x="215" y="46" width="70" height="44" rx="8" />
                  <rect class="br__sk-skarm" :class="{ 'br__sk-skarm--ok': fas >= 2 }" x="223" y="54" width="54" height="18" rx="3" />
                  <text class="br__sk-text" x="250" y="67">{{ B.skanna }}</text>
                  <rect class="br__sk-nos" x="241" y="90" width="18" height="7" rx="2" />
                </g>
              </template>
            </svg>

            <!-- Bevisbordet -->
            <section class="br__bevis">
              <div class="br__id-plats" aria-live="polite">
                <p v-if="idSyns" class="br__id">
                  {{ B.identifierad }} <b>{{ dana.name.toUpperCase() }}</b> · {{ dana.clothing }}
                </p>
              </div>
              <div class="br__pasar">
                <div v-for="i in PASAR" :key="i" class="pase" :class="{ 'pase--tom': !(i === 1 && pasFylld), 'pase--aktiv': i === 1 && idSyns }">
                  <span class="pase__remsa">{{ B.bevis }}</span>
                  <div v-if="i === 1 && pasFylld" class="pase__inne">
                    <div class="pl-pol pase__pol"><Placeholder :path="dana.image" :label="danaF" /></div>
                    <span class="pase__namn">{{ danaF }}</span>
                  </div>
                  <span v-else class="pase__nr" aria-hidden="true">{{ i }}</span>
                </div>
              </div>
              <span class="pl-raknare br__raknare">{{ B.raknare }} <b>{{ pasFylld ? 1 : 0 }}</b> {{ B.av(PASAR) }}</span>
            </section>
          </div>

          <!-- ============ 2 · UTREDNINGSBORDET ============ -->
          <div v-else-if="plats === 'utredning'" :key="scene" class="pl-bord rt__bord ut">
            <!-- Rörposten i vänsterkanten (mot labbet) -->
            <div class="ror" :class="{ 'ror--suger': suger }" aria-hidden="true"><span class="ror__mun" /></div>
            <span class="ror__text" :class="{ 'ror__text--on': suger }">{{ U.tillLabbet }}</span>

            <section class="ut__vanster">
              <div class="ut__polplats">
                <!-- Ny polaroid = nytt element (key) → glider fram med en CSS-animation vid montering -->
                <div
                  :key="paBordet" class="pl-pol ut__pol"
                  :class="{ 'ut__pol--ny': paBordet === 'nils', 'ut__pol--ror': paBordet === 'dana' && scene === 'markera' && fas >= 2 }"
                >
                    <Placeholder :path="paBordet === 'dana' ? dana.image : nils.image" :label="paBordet === 'dana' ? dana.name : nils.name" />
                    <span class="pl-pol__cap">{{ (paBordet === 'dana' ? dana.name : nils.name).toUpperCase() }}</span>
                    <span v-if="paBordet === 'dana' && danaStamplad" class="pl-stamp pl-stamp--in ut__stamp">{{ U.misstankt }}</span>
                    <span v-if="paBordet === 'nils' && nilsStamplad" class="pl-stamp pl-stamp--gra pl-stamp--in ut__stamp">{{ U.avskriven }}</span>
                </div>
              </div>
              <p class="ut__info">
                {{ paBordet === 'dana' ? dana.clothing : nils.clothing }} · {{ U.avtryck(1) }}
                <template v-if="scene === 'koppla' && fas >= 3"> · <b>{{ U.kopplat(kopplatTid) }}</b></template>
              </p>

              <!-- Stämplarna (markera): fingret trycker MISSTÄNKT för Dana, AVSKRIVEN för Nils -->
              <div v-if="scene === 'markera'" class="ut__stamplar">
                <span class="stampknapp stampknapp--rod">
                  <span class="stampknapp__handtag" aria-hidden="true" />
                  <span class="stampknapp__yta">{{ U.misstankt }}</span>
                  <span v-if="fas === 0" class="rt-tap" aria-hidden="true" />
                </span>
                <span class="stampknapp stampknapp--gra">
                  <span class="stampknapp__handtag" aria-hidden="true" />
                  <span class="stampknapp__yta">{{ U.avskriven }}</span>
                  <span v-if="fas === 3" class="rt-tap" aria-hidden="true" />
                </span>
              </div>

              <!-- Kön: Dana + Nils -->
              <div class="ko">
                <div class="ko__pol" :class="{ 'ko__pol--nu': paBordet === 'dana' }">
                  <Placeholder :path="dana.image" label="" />
                  <span v-if="danaStamplad" class="ko__stamp ko__stamp--rod">{{ U.misstankt }}</span>
                </div>
                <div class="ko__pol" :class="{ 'ko__pol--nu': paBordet === 'nils' }">
                  <Placeholder :path="nils.image" label="" />
                  <span v-if="nilsStamplad" class="ko__stamp ko__stamp--gra">{{ U.avskriven }}</span>
                </div>
                <span class="pl-raknare ko__raknare"><b>{{ paBordet === 'dana' ? 1 : 2 }}</b> {{ U.koAv(2) }}</span>
              </div>
            </section>

            <!-- Pappersarket: övningsfallets logg -->
            <section class="ut__hoger">
              <div class="pl-papper ark">
                <p class="ark__huvud">ÄRENDE {{ REF_CASE.id }} · ÖVERVAKNINGSLOGG</p>
                <ol class="ark__rader">
                  <li v-for="(e, i) in refLogg" :key="i" class="ark__rad">
                    <b class="ark__tid">{{ e.time }}</b>
                    <span class="ark__text"><template v-for="(b, k) in e.bitar" :key="k"><u v-if="b.klader" class="ark__klader">{{ b.text }}</u><template v-else>{{ b.text }}</template></template></span>
                    <svg v-if="i === ringRad && ringSyns" class="ark__ring" aria-hidden="true">
                      <ellipse
                        :class="scene === 'koppla' ? 'pl-penna ark__penna' : 'ark__penna ark__penna--fast'"
                        cx="50%" cy="50%" rx="48.5%" ry="45%" pathLength="1"
                      />
                    </svg>
                    <span v-if="i === ringRad && scene === 'koppla' && fas === 1" class="rt-tap rt-tap--rad" aria-hidden="true" />
                  </li>
                </ol>
              </div>
            </section>
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
                <span v-if="overens" class="pl-stamp pl-stamp--or pl-stamp--in tv__utpekad">UTPEKAD</span>
              </div>
            </div>
            <div class="tv__fot">
              <span class="tv__legend"><span class="tv__nal tv__nal--a" /> LABBET (sida A)</span>
              <span class="tv__legend"><span class="tv__nal tv__nal--b" /> FÄLTET (sida B) — ni</span>
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

/* Bilder i polaroider: Placeholder utan egen ram */
.rt :deep(.ph) { border: 0; border-radius: 0; box-shadow: none; background: #111; width: 100%; }

/* Fingret (tryck-prick) */
.rt-tap {
  position: absolute; right: -0.5rem; bottom: -0.5rem; z-index: 6; width: 1.3rem; height: 1.3rem; border-radius: 50%;
  background: rgba(255, 255, 255, 0.9); box-shadow: 0 0 0 7px rgba(var(--mode-accent-rgb), 0.35); animation: rt-tap 0.9s ease-in-out infinite;
}
.rt-tap--rad { right: 1.2rem; bottom: auto; top: 20%; }
@keyframes rt-tap { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.65); } }

/* ============ 1 · BROTTSPLATSEN ============ */
.br { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: clamp(0.6rem, 2.4cqi, 1.6rem); padding: clamp(0.6rem, 2cqi, 1.3rem); align-items: center; }
.br__yta { width: 100%; max-height: 100%; border-radius: 10px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.06); }
.br__ytan { fill: #3a3430; stroke: rgba(255, 255, 255, 0.08); }
.br__fp path { fill: none; stroke: #5b5070; stroke-width: 2.2; stroke-linecap: round; opacity: 0.45; }
.br__fp--tand path { stroke: #c9a2ff; opacity: 1; filter: drop-shadow(0 0 4px #a36bff); }
.br__fp--lys path { animation: br-fp 4.2s ease-in-out infinite; }
.br__penna { animation: br-svep 4.2s ease-in-out infinite; }
.br__penna-kropp { stroke: #cfd2d8; stroke-width: 12; stroke-linecap: round; }
.br__penna-spets { fill: #a36bff; }
/* Pennan sveper vänster → höger; strålen passerar avtrycket (x 250) vid ~57 % och tänder det. */
@keyframes br-svep {
  0%, 8% { transform: translateX(-60px); opacity: 0; }
  12% { opacity: 1; }
  80% { transform: translateX(250px); opacity: 1; }
  88%, 100% { transform: translateX(250px); opacity: 0; }
}
@keyframes br-fp {
  0%, 55% { stroke: #5b5070; opacity: 0.45; filter: none; }
  60%, 92% { stroke: #c9a2ff; opacity: 1; filter: drop-shadow(0 0 4px #a36bff); }
  100% { stroke: #5b5070; opacity: 0.45; filter: none; }
}
.br__sk { transform: translate(120px, -100px); opacity: 0; transition: transform 700ms cubic-bezier(0.3, 0.9, 0.4, 1), opacity 400ms ease; }
.br__sk--in { transform: none; opacity: 1; }
.br__sk-kropp { fill: #d9822b; stroke: #8a4d12; stroke-width: 2; }
.br__sk-skarm { fill: #1b1410; transition: fill 150ms; }
.br__sk-skarm--ok { fill: #2f6b3a; }
.br__sk-text { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; fill: #f0b46a; text-anchor: middle; }
.br__sk-nos { fill: #8a4d12; }
.br__ring { fill: none; stroke: var(--color-primary); stroke-width: 2.5; opacity: 0; transform-box: fill-box; transform-origin: center; }
.br__ring--on { animation: br-ring 0.7s ease-out infinite; }
@keyframes br-ring { 0% { opacity: 0.95; transform: scale(0.6); } 100% { opacity: 0; transform: scale(2.6); } }

.br__bevis { min-width: 0; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.br__id-plats { flex: none; min-height: 2em; display: flex; align-items: center; justify-content: center; font-size: clamp(0.85rem, 2cqi, 1.3rem); }
.br__id {
  margin: 0; padding: 0.2em 0.8em; border: 2px solid var(--color-primary); border-radius: 8px; background: rgba(5, 16, 11, 0.85);
  font-family: var(--font-mono); color: var(--color-ink-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.br__id { animation: br-id 280ms cubic-bezier(0.2, 1.2, 0.4, 1) both; }
.br__id b { color: var(--color-primary); }
@keyframes br-id { from { opacity: 0; transform: translateY(8px) scale(0.97); } }
.br__pasar { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: clamp(0.3rem, 1cqi, 0.7rem); }
.br__raknare { flex: none; font-size: clamp(1.1rem, 3cqi, 2rem); }

.pase {
  position: relative; min-width: 0; min-height: 0; container-type: size; display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  padding: 0 0.25rem 0.25rem; border: 1.5px solid rgba(225, 230, 240, 0.38); border-radius: 5px 5px 10px 10px; overflow: hidden;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.14) 0 18%, transparent 30% 62%, rgba(255, 255, 255, 0.07) 72%, transparent 84%), rgba(255, 255, 255, 0.05);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.35);
}
.pase--tom { border-style: dashed; border-color: rgba(225, 230, 240, 0.22); background: rgba(255, 255, 255, 0.025); box-shadow: none; }
.pase--aktiv { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary), var(--glow-strong); }
.pase__remsa {
  flex: none; align-self: stretch; margin: 0 -0.25rem; padding: 0.1em 0 0.12em; border-bottom: 2px dotted rgba(255, 255, 255, 0.35);
  background: #9e1f1a; color: #f3eee2; font-family: var(--font-mono); font-weight: 600; font-size: clamp(0.5rem, 1.1cqi, 0.75rem); letter-spacing: 0.2em; text-align: center;
}
.pase--tom .pase__remsa { background: rgba(158, 31, 26, 0.55); }
.pase__nr { margin: auto; font-family: var(--font-retro); font-size: clamp(0.9rem, 28cqh, 2rem); color: rgba(255, 255, 255, 0.12); }
.pase__inne { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem; animation: pase-land 520ms cubic-bezier(0.2, 1.3, 0.4, 1) both; }
.pase__pol { width: min(82cqw, 70cqh); padding: 0.15rem 0.15rem 0.35rem; transform: rotate(-2deg); }
.pase__namn { font-family: var(--font-retro); font-size: clamp(0.7rem, 15cqh, 1.6rem); line-height: 1; color: var(--color-ink-strong); white-space: nowrap; }
/* Liggande påse (bred skärm): polaroid och namn bredvid varandra, större. */
@container (min-aspect-ratio: 6 / 5) {
  .pase__inne { flex-direction: row; gap: 6cqw; }
  .pase__pol { width: min(46cqw, 86cqh); }
  .pase__namn { font-size: clamp(0.8rem, 24cqh, 2rem); }
}
@keyframes pase-land { from { opacity: 0; transform: translateY(-45%) scale(1.25) rotate(-8deg); } to { opacity: 1; transform: none; } }

@container rt (max-width: 760px) {
  .br { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1.1fr); }
  .br__yta { height: 100%; }
  .br__pasar { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

/* ============ 2 · UTREDNINGSBORDET ============ */
.ut {
  display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: clamp(0.6rem, 2.4cqi, 1.6rem);
  padding: clamp(0.6rem, 2cqi, 1.2rem) clamp(0.6rem, 2cqi, 1.2rem) clamp(0.6rem, 2cqi, 1.2rem) clamp(2.8rem, 6cqi, 4.2rem);
}
.ror {
  position: absolute; left: -4px; top: 18%; z-index: 3; width: clamp(1.9rem, 4cqi, 2.8rem); height: clamp(5rem, 28cqh, 8.5rem);
  border-radius: 0 999px 999px 0; background: linear-gradient(90deg, #5e3f12, #b98a35 35%, #f1d38c 52%, #c9973e 70%, #6f4c18);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55), inset 0 0 0 2px rgba(60, 38, 8, 0.6); transition: box-shadow 250ms ease;
}
.ror__mun { position: absolute; right: 18%; top: 14%; bottom: 14%; width: 42%; border-radius: 999px; background: radial-gradient(ellipse at 40% 50%, #050302, #1c1207 70%, #3a2709); box-shadow: inset 2px 0 6px rgba(0, 0, 0, 0.9); }
.ror--suger { box-shadow: 0 0 0 3px var(--color-primary), var(--glow-strong), 0 6px 16px rgba(0, 0, 0, 0.55); }
.ror__text {
  position: absolute; left: clamp(0.3rem, 1cqi, 0.7rem); top: calc(18% + clamp(5rem, 28cqh, 8.5rem) + 0.5rem); z-index: 3;
  writing-mode: vertical-rl; rotate: 180deg; letter-spacing: 0.12em; font-family: var(--font-mono); font-size: clamp(0.65rem, 1.2cqi, 0.9rem);
  color: var(--color-ink-muted); white-space: nowrap; transition: color 200ms ease;
}
.ror__text--on { color: var(--color-primary); text-shadow: var(--glow-soft); }

.ut__vanster { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: clamp(0.3rem, 1.4cqh, 0.7rem); }
.ut__polplats { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.ut__pol { width: min(100%, 52cqh); rotate: -1.2deg; padding-bottom: 2rem; }
.ut__stamp { left: 50%; top: 42%; translate: -50% -50%; font-size: clamp(1.1rem, 3.6cqi, 2.2rem); }
.ut__pol--ror { animation: ut-ror 1000ms cubic-bezier(0.55, 0, 0.75, 0.3) forwards; }
@keyframes ut-ror {
  0% { transform: none; opacity: 1; }
  35% { transform: scale(0.85, 0.5); border-radius: 40px; opacity: 1; }
  55% { transform: translateX(-20%) scale(0.32, 0.22); border-radius: 999px; opacity: 1; }
  100% { transform: translateX(-190%) scale(0.12, 0.1); border-radius: 999px; opacity: 0; }
}
.ut__pol--ny { animation: ut-ny 480ms cubic-bezier(0.2, 0.9, 0.3, 1) both; }
@keyframes ut-ny { from { transform: translateX(45%) rotate(6deg); opacity: 0; } }
.ut__info { flex: none; margin: 0; font-family: var(--font-mono); font-size: clamp(0.8rem, 1.8cqi, 1.15rem); color: var(--color-primary); text-align: center; }
.ut__info b { color: var(--color-ink-strong); }

.ut__stamplar { flex: none; display: flex; gap: clamp(0.6rem, 3cqi, 1.6rem); justify-content: center; }
.stampknapp { position: relative; display: flex; flex-direction: column; align-items: center; }
.stampknapp__handtag { width: 38%; height: clamp(0.9rem, 4cqh, 1.6rem); border-radius: 999px 999px 6px 6px; background: linear-gradient(90deg, #3a2414, #7a4e2b 45%, #4a2e17); box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5); }
.stampknapp__yta {
  margin-top: -2px; padding: 0.12em 0.5em 0.16em; border: 4px solid currentColor; border-radius: 7px; background: #efe9da;
  font-family: var(--font-retro); font-size: clamp(0.85rem, 2.2cqi, 1.5rem); letter-spacing: 0.04em; line-height: 1; box-shadow: 0 5px 10px rgba(0, 0, 0, 0.45);
}
.stampknapp--rod { color: #d0241b; }
.stampknapp--gra { color: #6f6a60; }

.ko { flex: none; display: flex; align-items: center; gap: clamp(0.35rem, 1cqi, 0.7rem); }
.ko__pol { position: relative; width: clamp(2.6rem, 8cqi, 4.4rem); padding: 0.18rem 0.18rem 0.45rem; background: #f3eee2; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); opacity: 0.8; }
.ko__pol:nth-child(odd) { rotate: -3deg; }
.ko__pol:nth-child(even) { rotate: 2deg; }
.ko__pol--nu { opacity: 1; outline: 3px solid var(--color-primary); outline-offset: 2px; }
.ko__stamp {
  position: absolute; left: 50%; top: 42%; translate: -50% -50%; rotate: -12deg; padding: 0 0.2em; border: 2px solid currentColor; border-radius: 3px;
  background: rgba(243, 238, 226, 0.85); font-family: var(--font-retro); font-size: clamp(0.45rem, 1.2cqi, 0.75rem); line-height: 1.1; white-space: nowrap;
  animation: ko-in 260ms cubic-bezier(0.2, 1.6, 0.4, 1) both;
}
@keyframes ko-in { from { opacity: 0; scale: 1.6; } }
.ko__stamp--rod { color: #d0241b; }
.ko__stamp--gra { color: #6f6a60; }
.ko__raknare { margin-left: 0.3rem; font-size: clamp(1.1rem, 3cqi, 1.9rem); }

.ut__hoger { min-width: 0; min-height: 0; display: flex; align-items: center; }
.ark {
  width: 100%; max-height: 100%; overflow: hidden; rotate: 0.4deg; padding: clamp(0.6rem, 2cqi, 1.2rem) clamp(0.6rem, 2cqi, 1.3rem);
  background-image: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 4px);
  font-size: clamp(0.8rem, 1.9cqi, 1.2rem);
}
.ark__huvud { margin: 0 0 0.6em; padding-bottom: 0.4em; border-bottom: 1.5px solid rgba(0, 0, 0, 0.25); font-weight: 700; letter-spacing: 0.06em; font-size: 0.9em; }
.ark__rader { margin: 0; padding: 0.2em 0.4em; list-style: none; display: flex; flex-direction: column; gap: 0.7em; }
.ark__rad { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 0.7em; align-items: baseline; padding: 0.25em 0.5em; line-height: 1.3; }
.ark__tid { font-weight: 700; }
.ark__klader { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 0.18em; }
.ark__ring { position: absolute; inset: -0.3em -0.4em; width: calc(100% + 0.8em); height: calc(100% + 0.6em); overflow: visible; pointer-events: none; rotate: -0.4deg; }
.ark__penna { vector-effect: none; stroke-width: 3.5; fill: none; stroke: #d0241b; stroke-linecap: round; }
.ark__ring .pl-penna { animation-duration: 700ms; }
.ark__penna--fast { stroke-dasharray: none; }

@container rt (max-width: 760px) {
  .ut { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
  .ut__stamplar { flex-direction: column; align-items: center; gap: 0.3rem; }
}

/* ============ ★ TAVLAN ============ */
.tv {
  display: flex; flex-direction: column; gap: 0.5rem; padding: clamp(0.5rem, 1.6cqi, 1rem);
  background-color: var(--color-background-2); background-image: none;
}
.tv__band { flex: none; display: flex; align-items: center; justify-content: center; padding: 0.4rem 0.8rem; border: 2px solid var(--color-primary-dim); border-radius: 10px; background: var(--color-background); transition: border-color 250ms, background 250ms; }
.tv__band--overens { border-color: #7ad14f; background: rgba(122, 209, 79, 0.12); }
.tv__band-stor { font-family: var(--font-retro); font-size: clamp(1.1rem, 3.2cqi, 2.2rem); letter-spacing: 0.05em; color: var(--color-ink-strong); }
.tv__kork {
  flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 1.4rem 1rem 1rem;
  border-radius: 12px; border: 2px solid var(--color-primary-dim); background-color: #b78a55;
  background-image: radial-gradient(rgba(90, 55, 20, 0.35) 1px, transparent 1.6px), radial-gradient(rgba(255, 235, 200, 0.18) 1px, transparent 1.6px);
  background-size: 9px 9px, 13px 13px;
}
.tv__kort { width: min(34cqi, 50cqh); rotate: -1.5deg; }
.tv__kort--min { box-shadow: 0 0 0 4px var(--color-primary), 0 10px 22px rgba(0, 0, 0, 0.55); }
.tv__nalar { position: absolute; top: -0.9rem; left: 50%; translate: -50% 0; display: flex; gap: 0.2rem; }
.tv__nal { display: inline-block; width: 1.7rem; height: 1.7rem; border-radius: 50%; box-shadow: 2px 5px 6px rgba(0, 0, 0, 0.5), inset -4px -4px 0 rgba(0, 0, 0, 0.15); vertical-align: middle; }
.tv__nalar .tv__nal { animation: tv-nal 260ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.tv__nal--a { background: #fff1d6; }
.tv__nal--b { background: #ff3cc8; }
.tv__utpekad { left: 8%; top: 32%; font-size: clamp(1.1rem, 3.6cqi, 2.4rem); }
.tv__fot { flex: none; display: flex; justify-content: center; gap: 1.4rem; flex-wrap: wrap; font-family: var(--font-mono); color: var(--color-ink-muted); }
.tv__legend { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(0.8rem, 1.6cqi, 1.05rem); }
.tv__legend .tv__nal { width: 1rem; height: 1rem; }
@keyframes tv-nal { from { transform: translateY(-18px) scale(1.5); opacity: 0; } to { transform: none; opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .br__penna, .br__ring--on, .rt-tap, .br__id, .pase__inne, .ut__pol--ror, .ut__pol--ny, .tv__nalar .tv__nal, .ko__stamp { animation: none; }
  .br__penna { opacity: 0; }
  .br__fp--lys path { animation: none; stroke: #c9a2ff; opacity: 1; }
  .ut__pol--ror { opacity: 0; }
  .br__sk { transition: none; }
}
</style>
