<script setup lang="ts">
/**
 * LABBETS PLATS 1 · MIKROSKOPBORDET (docs/STEGFLODE-FORSLAG.md §3.3, stillbild 3-mikroskopbordet.jpg).
 * Ett bord ovanifrån: ställningen med provglasen Q1–Q6 (nästa lyser, klara får ✓), mikroskopets bild som en
 * rund okularvy i mitten och tre burkar MÄNNISKA · DJUR · FIBER.
 *   FRYS (`stamp`, Microscope) → "Vilket prov?" (Q-chip, nästa ej klara förvalt) → dra bilden till en burk
 *   (`confirm` + kvitto-blink) → provglaset får ✓. Tryck en bild i en burk → helskärm bredvid kända prov
 *   (REF_HAR): flytta / ta bort.
 * Ändrar man sig: DRA en bild från en burk till en annan (tryck = granska som förut).
 * "Är ni nöjda?" (Josef 2026-11-26): när alla sex är sorterade visas alla burkar i helskärm — JA går vidare
 * till ljusbordet (`gaVidare('mikroskop')`), NEJ tillbaka till bordet ("Vi är klara ▸" öppnar den igen).
 * Utvägen "Gå vidare ▸" efter UTVAG_EFTER_SEK och minst 4 klara provglas öppnar samma översikt.
 * Saknas kameran och ?pilot=1 → FRYS visar en reservbild (REF_HAR i tur och ordning) så flödet går att testa.
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { HAIR_CLASSES, PROV_IDS, REF_HAR, UTVAG_EFTER_SEK, asset, type HairClassId } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { pilotUi } from '@/station-kit/kiosk/kioskSkip'
import { LABB } from '../../../ljus'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import Microscope from '../../Microscope.vue'
import Icon from '../../Icon.vue'
import { LABB_TEXT as T } from './labbText'
import {
  useLabbBord, klaraProv, nastaProv, bilderI, frys, slappFryst, laggIBurk, flytta, taBort, type LabbBild,
} from './labbBord'

const store = useUndersokningenStore()
const bord = useLabbBord()

/* Reservbilder (pilot utan kamera): blanda klasserna så att alla burkar används. */
const reserv = computed(() => {
  if (!pilotUi()) return []
  const ut: string[] = []
  for (let i = 0; i < 3; i++) for (const c of HAIR_CLASSES) if (REF_HAR[c.id][i]) ut.push(asset(REF_HAR[c.id][i].image))
  return ut
})

const scope = ref<InstanceType<typeof Microscope> | null>(null)
const klara = computed(() => klaraProv.value.length)
const uppdrag = computed(() =>
  bord.fryst ? T.mikroskop.fryst : nastaProv.value ? T.mikroskop.lagg(nastaProv.value) : T.mikroskop.alla,
)
const utvag = computed(() => {
  const start = store.state.startedAt
  return !!start && store.now - start >= UTVAG_EFTER_SEK * 1000 && klara.value >= 4
})
/** Provglaset som ligger under mikroskopet just nu (den frusna bildens Q, annars nästa). */
const underMikroskopet = computed(() => (bord.fryst ? bord.frystQ : nastaProv.value))

function onCapture(src: string): void {
  frys(src)
  store.notifyActivity()
}
function onRelease(): void {
  if (bord.fryst) slappFryst()
}
function valjQ(q: string): void {
  bord.frystQ = q
  audio.play('blip')
  store.notifyActivity()
}

/* ---- pointer-drag till en burk (touch-vänligt, ingen HTML5 DnD): den frusna bilden, ELLER en bild som redan
 *      ligger i en burk och flyttas (flyttaId) när man ändrar sig ---- */
const drag = ref<{ src: string; q: string | null; x: number; y: number; flyttaId?: string } | null>(null)
const overBurk = ref<HairClassId | null>(null)

function burkUnder(x: number, y: number): HairClassId | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-burk]')
  return (el?.dataset.burk as HairClassId) ?? null
}
function onMove(e: PointerEvent): void {
  if (!drag.value) return
  drag.value = { ...drag.value, x: e.clientX, y: e.clientY }
  overBurk.value = burkUnder(e.clientX, e.clientY)
}
function slutaDra(): void {
  drag.value = null
  overBurk.value = null
  bord.drar = false
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', slutaDra)
}
function onUp(e: PointerEvent): void {
  const kat = burkUnder(e.clientX, e.clientY)
  const fid = drag.value?.flyttaId
  if (fid) {
    const b = bord.bilder.find((x) => x.id === fid)
    if (kat && b && b.kategori !== kat) {
      flytta(fid, kat)
      audio.play('confirm')
      useLjus().gest('kvitto', [LABB], { tyst: true })
      store.notifyActivity()
    }
  } else if (kat && laggIBurk(kat)) {
    audio.play('confirm')
    // Bara kvitto: appen vet inte om provet hamnade rätt (ingen facit-kontroll) → inte rätt/fel.
    useLjus().gest('kvitto', [LABB], { tyst: true })
    scope.value?.release() // tillbaka till live för nästa prov
    store.notifyActivity()
  }
  slutaDra()
}
function onGrab(e: PointerEvent): void {
  if (!bord.fryst) return
  drag.value = { src: bord.fryst.src, q: bord.frystQ, x: e.clientX, y: e.clientY }
  bord.drar = true
  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', slutaDra)
}

/* ---- en bild i en burk: tryck = granska, dra (> 10 px) = flytta till en annan burk ---- */
let tryck: { b: LabbBild; x: number; y: number; id: number } | null = null
function tummeNer(e: PointerEvent, b: LabbBild): void {
  if (bord.fryst) return // en sak i taget: sortera den frusna bilden först
  tryck = { b, x: e.clientX, y: e.clientY, id: e.pointerId }
  window.addEventListener('pointermove', tummeFlytt)
  window.addEventListener('pointerup', tummeUpp)
  window.addEventListener('pointercancel', tummeAvbryt)
}
function tummeFlytt(e: PointerEvent): void {
  if (!tryck || drag.value) return
  if (Math.hypot(e.clientX - tryck.x, e.clientY - tryck.y) < 10) return
  // Rörde sig → börja dra bilden (tryck-granskningen blir inte av).
  drag.value = { src: tryck.b.src, q: tryck.b.q, x: e.clientX, y: e.clientY, flyttaId: tryck.b.id }
  bord.drar = true
  tummeAvbryt()
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', slutaDra)
}
function tummeUpp(): void {
  const b = tryck?.b
  tummeAvbryt()
  if (b) oppna(b)
}
function tummeAvbryt(): void {
  tryck = null
  window.removeEventListener('pointermove', tummeFlytt)
  window.removeEventListener('pointerup', tummeUpp)
  window.removeEventListener('pointercancel', tummeAvbryt)
}

/* ---- Dra-tipset: första frysta provet (Josef 2026-11-26) — en spökbild + ett finger glider från okularet ut
 *      över burkarna (utan att peka ut rätt burk) tills de själva börjar dra. ---- */
const rot = ref<HTMLElement | null>(null)
const tips = ref<{ x: number; y: number; dx: number; dy: number; bredd: number } | null>(null)
watch(
  () => bord.fryst,
  async (f) => {
    if (!f || bord.dragTipsVisat || bord.bilder.length) return
    await nextTick()
    const r = rot.value?.getBoundingClientRect()
    const fran = rot.value?.querySelector('.mb__okular')?.getBoundingClientRect()
    const till = rot.value?.querySelector('.mb__burkrad')?.getBoundingClientRect()
    if (!r || !fran || !till) return
    const x = fran.left + fran.width / 2 - r.left
    const y = fran.top + fran.height * 0.42 - r.top
    tips.value = { x, y, dx: till.left + till.width * 0.2 - r.left - x, dy: till.top + till.height * 0.55 - r.top - y, bredd: till.width * 0.6 }
  },
)
watch(
  () => [bord.drar, bord.fryst, bord.bilder.length] as const,
  ([drar, fryst, n]) => {
    if (tips.value && (drar || !fryst || n)) {
      tips.value = null
      bord.dragTipsVisat = true
    }
  },
)

/* ---- "Är ni nöjda?": alla burkar i helskärm innan ljusbordet ---- */
const nojd = ref(false)
const allaKlara = computed(() => klara.value >= PROV_IDS.length)
function oppnaNojd(): void {
  if (bord.fryst) slappFryst()
  visadId.value = null
  nojd.value = true
  audio.play('popup')
  store.notifyActivity()
}
function nojdNej(): void {
  nojd.value = false
  audio.play('blip')
  store.notifyActivity()
}
function nojdJa(): void {
  nojd.value = false
  store.gaVidare('mikroskop')
}
// Sista provglaset hamnar i en burk → översikten kommer av sig själv (en gång per gång de blir klara).
watch(allaKlara, (ja, fore) => {
  if (ja && !fore) setTimeout(() => { if (allaKlara.value && !bord.fryst) oppnaNojd() }, 700)
})

/* ---- granska en bild i helskärm bredvid kända prov ---- */
const visadId = ref<string | null>(null)
const visad = computed<LabbBild | null>(() => bord.bilder.find((b) => b.id === visadId.value) ?? null)
function oppna(b: LabbBild): void {
  if (bord.fryst) return // en sak i taget: sortera den frusna bilden först
  visadId.value = b.id
  store.notifyActivity()
}
function stang(): void {
  visadId.value = null
  store.notifyActivity()
}
function flyttaVisad(kat: HairClassId): void {
  if (!visad.value) return
  flytta(visad.value.id, kat)
  visadId.value = null
  audio.play('confirm')
  useLjus().gest('kvitto', [LABB], { tyst: true })
  store.notifyActivity()
}
function taBortVisad(): void {
  if (!visad.value) return
  taBort(visad.value.id)
  visadId.value = null
  audio.play('nobuy') // mjuk sjunkande kvint, inte fel-surret
  store.notifyActivity()
}

onBeforeUnmount(() => {
  slutaDra()
  tummeAvbryt()
  // Okularvyn monteras om i live-läge → en kvarglömd fryst bild släpps.
  if (bord.fryst) slappFryst()
})
</script>

<template>
  <div ref="rot" class="mb">
    <header class="pl-huvud mb__huvud">
      <h2 class="pl-titel">{{ T.mikroskop.titel }}</h2>
      <p class="pl-uppdrag">{{ uppdrag }}</p>
    </header>

    <div class="pl-bord mb__bord">
     <div class="mb__yta">
      <!-- Ställningen med provglasen -->
      <aside class="mb__stall">
        <div class="pl-raknare mb__raknare">{{ T.mikroskop.raknare }} <b>{{ klara }}</b> av {{ PROV_IDS.length }}</div>
        <div
          v-for="q in PROV_IDS" :key="q" class="mb__glas"
          :class="{ 'mb__glas--klar': klaraProv.includes(q), 'mb__glas--nu': underMikroskopet === q }"
        >
          <span class="mb__glas-q">{{ q }}</span>
          <svg class="mb__glas-har" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 14 Q 40 6 96 8" />
          </svg>
          <span v-if="klaraProv.includes(q)" class="mb__glas-ok">✓</span>
        </div>
      </aside>

      <!-- Okularvyn -->
      <div class="mb__okular">
        <Microscope
          ref="scope" okular :reserv="reserv" :frys-text="T.mikroskop.frys" :tillbaka-text="T.mikroskop.tillbaka"
          @capture="onCapture" @grab="onGrab" @release="onRelease"
        >
          <template #over>
            <div class="mb__q" @pointerdown.stop>
              <span class="mb__q-fraga">{{ T.mikroskop.vilket }}</span>
              <div class="mb__q-chips">
                <button
                  v-for="q in PROV_IDS" :key="q" type="button" class="mb__q-chip"
                  :class="{ 'mb__q-chip--on': bord.frystQ === q, 'mb__q-chip--klar': klaraProv.includes(q) }"
                  @click="valjQ(q)"
                >{{ q }}<span v-if="klaraProv.includes(q)">✓</span></button>
              </div>
            </div>
          </template>
        </Microscope>
      </div>

      <!-- Burkarna -->
      <div class="mb__burkar">
        <p class="mb__gor" :class="{ 'mb__gor--dra': !!bord.fryst, 'mb__gor--tips': !!tips }">{{ bord.fryst ? T.mikroskop.draHitHit : T.mikroskop.gor }}</p>
        <div class="mb__burkrad">
          <div
            v-for="c in HAIR_CLASSES" :key="c.id" class="mb__burk" :data-burk="c.id"
            :class="{ 'mb__burk--drop': !!drag, 'mb__burk--over': overBurk === c.id }"
          >
            <span class="mb__burk-etikett">{{ T.burk[c.id] }}</span>
            <span v-if="drag" class="mb__burk-hit">{{ T.mikroskop.draHit }}</span>
            <div class="mb__burk-inne">
              <button
                v-for="b in bilderI(c.id)" :key="b.id" type="button" class="mb__tumme" :title="T.mikroskop.burkTryck"
                :class="{ 'mb__tumme--dras': drag?.flyttaId === b.id }" @pointerdown.prevent="tummeNer($event, b)"
              >
                <img :src="b.src" alt="" draggable="false" />
                <span class="mb__tumme-q">{{ b.q }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

     </div>
      <button v-if="allaKlara" type="button" class="crt-button crt-button--strong mb__klara" @click="oppnaNojd">{{ T.mikroskop.klara }}</button>
      <button v-else-if="utvag" type="button" class="pl-utvag mb__utvag" @click="oppnaNojd">{{ T.utvag }}</button>
    </div>

    <!-- Dra-tipset (första frysta provet): spökbild + finger glider ut över burkarna -->
    <div
      v-if="tips && bord.fryst" class="mb__tips" aria-hidden="true"
      :style="{ left: tips.x + 'px', top: tips.y + 'px', '--dx': tips.dx + 'px', '--dy': tips.dy + 'px', '--svep': tips.bredd + 'px' }"
    >
      <div class="mb__tips-bild"><img :src="bord.fryst.src" alt="" /><span class="mb__tips-finger" /></div>
    </div>

    <!-- Drag-spöke -->
    <div v-if="drag" class="mb__spoke" :style="{ left: drag.x + 'px', top: drag.y + 'px' }">
      <img :src="drag.src" alt="" />
      <span>{{ drag.q }}</span>
    </div>

    <!-- "Är ni nöjda?" — alla burkar i helskärm; dra mellan burkarna här också -->
    <Transition name="mb-fade">
      <div v-if="nojd" class="mb__nojd">
        <header class="mb__nojd-huvud">
          <h2 class="mb__nojd-fraga">{{ T.mikroskop.nojdFraga }}</h2>
          <p class="mb__nojd-sub">{{ T.mikroskop.nojdSub }}<template v-if="!allaKlara"> {{ T.mikroskop.nojdSaknas(PROV_IDS.length - klara) }}</template></p>
        </header>
        <div class="mb__nojd-burkar">
          <div
            v-for="c in HAIR_CLASSES" :key="c.id" class="mb__nojd-burk" :data-burk="c.id"
            :class="{ 'mb__burk--drop': !!drag, 'mb__burk--over': overBurk === c.id }"
          >
            <span class="mb__burk-etikett mb__nojd-etikett">{{ T.burk[c.id] }}</span>
            <div class="mb__nojd-inne">
              <button
                v-for="b in bilderI(c.id)" :key="b.id" type="button" class="mb__tumme mb__nojd-tumme"
                :class="{ 'mb__tumme--dras': drag?.flyttaId === b.id }" @pointerdown.prevent="tummeNer($event, b)"
              >
                <img :src="b.src" alt="" draggable="false" />
                <span class="mb__tumme-q">{{ b.q }}</span>
              </button>
              <span v-if="!bilderI(c.id).length" class="mb__nojd-tom">—</span>
            </div>
          </div>
        </div>
        <div class="mb__nojd-knappar">
          <button type="button" class="crt-button mb__knapp" @click="nojdNej">{{ T.mikroskop.nojdNej }}</button>
          <button type="button" class="crt-button crt-button--strong mb__knapp" @click="nojdJa">{{ T.mikroskop.nojdJa }}</button>
        </div>
      </div>
    </Transition>

    <!-- Egen bild i helskärm bredvid kända prov: flytta, ta bort eller tillbaka -->
    <Transition name="mb-fade">
      <div v-if="visad" class="mb__granska" @click.self="stang">
        <div class="mb__granska-er">
          <span class="mb__granska-label">{{ T.granska.er }} · {{ visad.q }} · {{ T.burk[visad.kategori] }}</span>
          <img class="mb__granska-img" :src="visad.src" alt="" />
        </div>
        <div class="mb__granska-kanda">
          <span class="mb__granska-label">{{ T.granska.kanda }}</span>
          <div
            v-for="c in HAIR_CLASSES" :key="c.id" class="mb__granska-rad"
            :class="{ 'mb__granska-rad--nu': c.id === visad.kategori }"
          >
            <span class="mb__granska-namn">{{ T.burk[c.id] }}</span>
            <img v-for="r in REF_HAR[c.id]" :key="r.image" :src="asset(r.image)" :alt="r.label" :title="r.label" />
          </div>
        </div>
        <div class="mb__granska-knappar">
          <button type="button" class="crt-button mb__knapp" @click="stang">{{ T.granska.tillbaka }}</button>
          <button
            v-for="c in HAIR_CLASSES.filter((k) => k.id !== visad!.kategori)" :key="c.id" type="button"
            class="crt-button crt-button--strong mb__knapp" @click="flyttaVisad(c.id)"
          >{{ T.granska.flytta(T.burk[c.id]) }}</button>
          <button type="button" class="crt-button mb__knapp mb__knapp--del" @click="taBortVisad">
            <Icon name="close" :size="24" /> {{ T.granska.taBort }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mb { container-type: inline-size; position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.mb__huvud { flex-wrap: wrap; row-gap: 0.2rem; }

.mb__bord { container-type: inline-size; }
.mb__yta {
  height: 100%; display: grid; grid-template-columns: minmax(7.5rem, 0.75fr) minmax(0, 1.5fr) minmax(0, 1.25fr);
  gap: clamp(0.6rem, 2cqi, 2rem); padding: clamp(0.6rem, 2cqi, 1.6rem);
}

/* Ställningen: en träram med sex provglas */
.mb__stall {
  display: flex; flex-direction: column; gap: clamp(0.3rem, 1cqi, 0.7rem); min-height: 0; padding: 0.7rem;
  background: rgba(0, 0, 0, 0.22); border: 2px solid rgba(255, 210, 160, 0.12); border-radius: 10px;
}
.mb__raknare { font-size: clamp(1.1rem, 3cqi, 2rem); white-space: nowrap; }
.mb__glas {
  position: relative; flex: 1; min-height: 2.2rem; max-height: 4.6rem; display: flex; align-items: center; gap: 0.5rem;
  padding: 0 0.7rem; border-radius: 5px; border: 2px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(180deg, rgba(220, 230, 235, 0.22), rgba(160, 175, 180, 0.12));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.mb__glas-q { font-family: var(--font-retro); font-size: clamp(1.1rem, 2.6cqi, 1.8rem); color: var(--color-ink-strong); }
.mb__glas-har { flex: 1; height: 1rem; fill: none; stroke: rgba(30, 20, 15, 0.65); stroke-width: 2; }
.mb__glas-ok { font-family: var(--font-retro); font-size: clamp(1.1rem, 2.4cqi, 1.7rem); color: var(--color-primary); }
.mb__glas--klar { opacity: 0.72; }
.mb__glas--nu {
  opacity: 1; border-color: var(--color-primary); box-shadow: var(--glow-soft), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  animation: mb-puls 1.6s ease-in-out infinite;
}
@keyframes mb-puls { 50% { box-shadow: var(--glow-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25); } }

/* Okularvyn */
.mb__okular { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.mb__okular :deep(.scope) { flex: 1; min-height: 0; }
.mb__q {
  position: absolute; left: 50%; bottom: 9%; translate: -50% 0; z-index: 3; display: flex; flex-direction: column;
  align-items: center; gap: 0.3rem; padding: 0.4rem 0.6rem; border-radius: 12px; background: rgba(2, 6, 4, 0.78);
}
.mb__q-fraga { font-family: var(--font-retro); font-size: clamp(0.95rem, 2.2cqi, 1.4rem); color: var(--color-ink-strong); }
.mb__q-chips { display: grid; grid-template-columns: repeat(3, auto); gap: 0.3rem; }
.mb__q-chip {
  font-family: var(--font-retro); font-size: clamp(0.95rem, 2.2cqi, 1.35rem); min-width: 3em; padding: 0.15em 0.4em;
  color: var(--color-ink-muted); background: var(--color-background-2); border: 2px solid var(--color-primary-dim);
  border-radius: 8px; cursor: pointer;
}
.mb__q-chip span { font-size: 0.75em; margin-left: 0.15em; }
.mb__q-chip--klar { opacity: 0.7; }
.mb__q-chip--on { opacity: 1; color: #120c06; background: var(--color-primary); border-color: var(--color-primary); }

/* Burkarna */
.mb__burkar { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 0.8rem; }
.mb__gor--dra { color: var(--color-primary) !important; }
.mb__gor--tips { font-family: var(--font-retro); font-size: clamp(1.2rem, 3cqi, 1.9rem) !important; text-shadow: var(--glow-soft); animation: mb-puls-text 1.2s ease-in-out infinite; }
@keyframes mb-puls-text { 50% { opacity: 0.55; } }
.mb__gor { margin: 0; font-family: var(--font-mono); font-size: clamp(0.9rem, 2cqi, 1.25rem); color: var(--color-ink-muted); }
.mb__burkrad { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(0.4rem, 1.2cqi, 1rem); align-items: end; }
.mb__burk {
  position: relative; height: min(100%, 22rem); min-height: 9rem; display: flex; flex-direction: column; align-items: center;
  padding: 1.4rem 0.35rem 0.5rem; border: 3px solid rgba(220, 235, 240, 0.32); border-top-width: 6px;
  border-radius: 6px 6px 26px 26px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 40%, rgba(255, 255, 255, 0.08));
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}
.mb__burk-etikett {
  max-width: 100%; padding: 0.25em 0.5em; background: #efe9da; color: #1d1d1d; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
  font-family: var(--font-retro); font-size: clamp(0.8rem, 2.2cqi, 1.35rem); letter-spacing: 0.03em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mb__burk-hit { margin-top: 0.4rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-primary); }
.mb__burk-inne {
  flex: 1; min-height: 0; width: 100%; margin-top: 0.4rem; display: flex; flex-wrap: wrap-reverse; align-content: flex-start;
  justify-content: center; gap: 0.3rem; overflow-y: auto;
}
.mb__burk--drop { border-style: dashed; border-color: var(--color-primary-dim); }
.mb__burk--over { border-style: solid; border-color: var(--color-primary); box-shadow: var(--glow-strong); transform: scale(1.03); }
.mb__tumme {
  position: relative; width: clamp(2.8rem, 9cqi, 4.6rem); aspect-ratio: 4 / 3; padding: 0; overflow: hidden; cursor: pointer;
  border: 2px solid #efe9da; border-radius: 3px; background: #000; animation: mb-in 220ms ease-out both;
}
.mb__tumme img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mb__tumme-q {
  position: absolute; left: 0; bottom: 0; padding: 0 0.25em; background: #efe9da; color: #1d1d1d;
  font-family: var(--font-mono); font-weight: 600; font-size: 0.7rem;
}
@keyframes mb-in { from { opacity: 0; transform: scale(0.8) translateY(-10px); } }

.mb__utvag { position: absolute; right: 1rem; bottom: 1rem; z-index: 4; }
.mb__klara { position: absolute; right: 1rem; bottom: 1rem; z-index: 4; font-size: clamp(1.1rem, 2.4cqi, 1.7rem); animation: mb-puls 1.6s ease-in-out infinite; }
.mb__tumme { touch-action: none; }
.mb__tumme--dras { opacity: 0.35; }

/* Dra-tipset */
.mb__tips { position: absolute; z-index: 20; width: 0; height: 0; pointer-events: none; }
.mb__tips-bild {
  position: absolute; left: -3rem; top: -2.25rem; width: 6rem; aspect-ratio: 4 / 3; border: 3px solid #efe9da; border-radius: 4px;
  box-shadow: var(--glow-strong); animation: mb-tips 2.4s cubic-bezier(0.45, 0, 0.3, 1) infinite;
}
.mb__tips-bild img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.85; }
.mb__tips-finger {
  position: absolute; right: -0.9rem; bottom: -1.1rem; width: 2.2rem; height: 2.2rem; border-radius: 50%;
  background: rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.25);
}
.mb__tips-text {
  position: absolute; left: 50%; top: 3.4rem; translate: -50% 0; margin: 0; white-space: nowrap; padding: 0.3em 0.8em;
  border-radius: 999px; background: rgba(2, 6, 4, 0.85); font-family: var(--font-retro); font-size: clamp(1.1rem, 2.6cqi, 1.7rem);
  color: var(--color-ink-strong); text-shadow: var(--glow-soft);
}
@keyframes mb-tips {
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  55% { transform: translate(var(--dx), var(--dy)) scale(0.8); }
  80% { transform: translate(calc(var(--dx) + var(--svep)), var(--dy)) scale(0.8); opacity: 1; }
  100% { transform: translate(calc(var(--dx) + var(--svep)), var(--dy)) scale(0.8); opacity: 0; }
}

/* "Är ni nöjda?" (helskärm över platsen) */
.mb__nojd {
  position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column; gap: clamp(0.6rem, 2vmin, 1.4rem);
  padding: clamp(0.8rem, 3vmin, 2rem); background: rgba(2, 6, 4, 0.96);
}
.mb__nojd-huvud { text-align: center; }
.mb__nojd-fraga { margin: 0; font-family: var(--font-retro); font-size: clamp(2rem, 6cqi, 4rem); color: var(--color-primary); text-shadow: var(--glow-soft); }
.mb__nojd-sub { margin: 0.3rem 0 0; font-family: var(--font-mono); font-size: clamp(0.95rem, 2cqi, 1.3rem); color: var(--color-ink-strong); }
.mb__nojd-burkar { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(0.6rem, 2cqi, 1.6rem); }
.mb__nojd-burk {
  position: relative; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
  padding: 0.8rem 0.6rem; border: 3px solid rgba(220, 235, 240, 0.32); border-top-width: 6px; border-radius: 6px 6px 26px 26px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 40%, rgba(255, 255, 255, 0.08));
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}
.mb__nojd-etikett { font-size: clamp(1rem, 3cqi, 1.8rem); }
.mb__nojd-inne { flex: 1; min-height: 0; width: 100%; display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center; gap: 0.6rem; overflow-y: auto; }
.mb__nojd-tumme { width: clamp(6rem, 18cqi, 12rem); }
.mb__nojd-tumme .mb__tumme-q { font-size: clamp(0.8rem, 1.8cqi, 1.1rem); }
.mb__nojd-tom { align-self: center; font-family: var(--font-mono); color: var(--color-ink-muted); }
.mb__nojd-knappar { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }

.mb__spoke {
  position: fixed; z-index: 95; width: 6rem; aspect-ratio: 4 / 3; margin: -2.25rem 0 0 -3rem; pointer-events: none;
  border: 3px solid #efe9da; border-radius: 4px; overflow: hidden; box-shadow: var(--glow-strong); transform: rotate(-4deg);
}
.mb__spoke img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mb__spoke span { position: absolute; left: 0; bottom: 0; padding: 0 0.3em; background: #efe9da; color: #1d1d1d; font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; }

/* Granskning (helskärm över platsen) */
.mb__granska {
  position: absolute; inset: 0; z-index: 30; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto; gap: 1rem 1.4rem; padding: clamp(0.8rem, 3vmin, 2rem); background: rgba(2, 6, 4, 0.96);
}
.mb__granska-er, .mb__granska-kanda { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
.mb__granska-label { font-family: var(--font-mono); font-size: 0.9rem; letter-spacing: 0.1em; color: var(--color-primary); }
.mb__granska-img { flex: 1; min-height: 0; width: 100%; object-fit: contain; background: #000; border: 1px solid var(--color-primary); box-shadow: var(--glow-strong); }
.mb__granska-rad {
  flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: auto minmax(0, 1fr);
  gap: 0.3rem 0.4rem; padding: 0.35rem; border: 1px solid transparent; border-radius: 8px; opacity: 0.75;
}
.mb__granska-rad--nu { border-color: var(--color-primary); opacity: 1; background: rgba(255, 255, 255, 0.04); }
.mb__granska-namn { grid-column: 1 / -1; font-family: var(--font-retro); font-size: clamp(0.9rem, 1.6vw, 1.2rem); color: var(--color-ink-strong); }
.mb__granska-rad img { width: 100%; height: 100%; min-height: 0; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-primary-dim); }
.mb__granska-knappar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem; }
.mb__knapp { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: clamp(1rem, 2vw, 1.5rem); padding: 0.7em 1.3em; }
.mb__knapp--del { color: var(--color-danger); border-color: var(--color-danger); }
.mb-fade-enter-active { transition: opacity 180ms ease-out; }
.mb-fade-leave-active { transition: opacity 140ms ease-out; }
.mb-fade-enter-from, .mb-fade-leave-to { opacity: 0; }

/* Halv bredd (#shared): ställningen blir en rad överst, okular + burkar under */
@container (max-width: 1100px) {
  .mb__yta { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .mb__stall { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; padding: 0.4rem 0.6rem; }
  .mb__raknare { flex-basis: 100%; }
  .mb__glas { flex: 1 1 4.5rem; min-height: 2.2rem; max-height: none; }
  .mb__glas-har { display: none; }
}
@container (max-width: 700px) {
  .mb__granska { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1.2fr) auto; }
}
@media (prefers-reduced-motion: reduce) {
  .mb__glas--nu, .mb__tumme { animation: none; }
}
</style>
