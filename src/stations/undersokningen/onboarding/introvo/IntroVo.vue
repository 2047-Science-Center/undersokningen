<script setup lang="ts">
/**
 * VALdi-INTROT — VALdi läser introt, undertexten följer rösten och introt rullar av sig självt.
 * Inga klickpunkter. Kapitel: öppning (läges-legenden) → fallet (3D-filmen) → klar (emit done →
 * rollgenomgången, som klickas igenom utan röst).
 *
 * Båda skärmarna väntar in varandra ("Väntar på andra sidan …") innan introt börjar. Klockan delas:
 * när båda är framme sätter ledaren `store.introStartAt` (epoch-ms för t = 0), båda räknar t ur den. Rösten spelas EN gång i stationens högtalare, från ledarfönstret, via
 * ljudmotorn (audio.syncVoice spolar om den glider). Ett tryck var som helst hoppar till nästa
 * kapitel, på båda skärmarna. Undertexten = station-kit/undertext (samma lager som riggens klipp).
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { asset } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import ModeLegend from '@/station-kit/components/ModeLegend.vue'
import { Undertext, sprakFranUrl } from '@/station-kit/undertext'
import IntroFilm from '../introfilm/IntroFilm.vue'
import { useUndersokningenStore } from '../../store/undersokningenStore'
import { INTRO_VO, INTRO_RADER, INTRO_END, FILM_START, kapitelVid, nastaKapitel } from './introVo'

const emit = defineEmits<{ done: [] }>()
const store = useUndersokningenStore()
const sprak = sprakFranUrl()
const LJUD = asset(INTRO_VO.ljud)
/** Ledaren startar klockan så här långt fram, så att andra skärmen hinner få den (ms). */
const STARTMARGINAL = 400

const nu = ref(Date.now())
const monterad = Date.now()
let raf = 0
let klar = false

/** En starttid räknas bara om introt inte redan var slut när vi kom hit (skydd mot gammal klocka). */
const giltigStart = computed(() => {
  const at = store.introStartAt
  return at != null && at + INTRO_END * 1000 > monterad - 2000 ? at : null
})
const t = computed(() => (giltigStart.value == null ? 0 : Math.max(0, (nu.value - giltigStart.value) / 1000)))
const kapitel = computed(() => kapitelVid(t.value))

/** Den här skärmens sida (delad vy = en skärm, väntar inte på någon). */
const minSida = computed(() => (store.view === 'lag2' ? 'lag2' : 'lag1'))
const badaRedo = computed(() => store.view === 'shared' || (store.introRedo.lag1 && store.introRedo.lag2))
/** Ledaren: båda framme och ingen giltig klocka → starta. */
watch(
  badaRedo,
  (b) => {
    if (b && store.leader && giltigStart.value == null) store.introStart(Date.now() + STARTMARGINAL)
  },
  { immediate: true },
)
let redoTimer: ReturnType<typeof setInterval> | null = null

/** Öppningen: blått lyser under "blå"-repliken, orange under "orange"-repliken. */
const legendFokus = computed(() => {
  const id = INTRO_RADER.find((r) => t.value >= r.t && t.value < (r.slut ?? r.t))?.id
  return id === 'o2' ? 'tut' : id === 'o3' ? 'live' : null
})

function tick(): void {
  nu.value = Date.now()
  if (store.leader && giltigStart.value != null) {
    if (t.value < INTRO_VO.duration_s) audio.syncVoice(LJUD, t.value)
    else audio.stopVoice()
  }
  raf = requestAnimationFrame(tick)
}

/** Ett tryck: nästa kapitel, för båda skärmarna (flyttar den delade klockan). */
function hoppa(): void {
  if (giltigStart.value == null) return
  store.introStart(Date.now() - nastaKapitel(t.value) * 1000)
}

watch(kapitel, (k) => {
  if (k !== 'klar' || klar) return
  klar = true
  if (store.leader) audio.stopVoice()
  emit('done')
})

onMounted(() => {
  if (store.view !== 'shared') {
    store.introMarkRedo(minSida.value)
    // Skicka om tills klockan går (andra skärmen kan ha laddats om eller missat meddelandet).
    redoTimer = setInterval(() => {
      if (giltigStart.value != null) {
        if (redoTimer) clearInterval(redoTimer)
        redoTimer = null
      } else store.introMarkRedo(minSida.value)
    }, 1500)
  }
  tick()
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  if (redoTimer) clearInterval(redoTimer)
  if (store.leader) audio.stopVoice()
})
</script>

<template>
  <div class="iv" @pointerdown="hoppa">
    <!-- Väntar på andra skärmen (introt startar på båda samtidigt) -->
    <div v-if="giltigStart == null" class="iv__oppning">
      <p class="iv__titel">STÖLDEN I VALVET</p>
      <p class="iv__vantar">Väntar på andra sidan …</p>
    </div>

    <!-- Kapitel 1: öppning -->
    <div v-else-if="kapitel === 'oppning'" class="iv__oppning">
      <p class="iv__titel">STÖLDEN I VALVET</p>
      <ModeLegend class="iv__legend" :class="legendFokus && `iv__legend--${legendFokus}`" />
    </div>

    <!-- Kapitel 2: fallet (3D-filmen), bilden följer rösten -->
    <IntroFilm v-else :tid="t - FILM_START" :sfx="store.leader" />

    <template v-if="giltigStart != null">
      <Undertext :rader="INTRO_RADER" :tid="t" :sprak="sprak" />
      <span class="iv__hoppa" aria-hidden="true">Tryck för att hoppa över ▸</span>
    </template>
  </div>
</template>

<style scoped>
.iv { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; cursor: pointer; user-select: none; }
.iv__oppning { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(1.4rem, 4vh, 2.6rem); padding-bottom: 12vh; }
.iv__titel { margin: 0; font-family: var(--font-retro); font-size: clamp(2.4rem, 7vw, 5rem); letter-spacing: 0.08em; color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.iv__vantar { margin: 0; font-family: var(--font-mono); font-size: clamp(1.1rem, 2.4vw, 1.6rem); color: var(--color-ink-muted); animation: iv-puls 2s ease-in-out infinite; }
@keyframes iv-puls { 50% { opacity: 0.45; } }
.iv__legend { transform: scale(1.25); transform-origin: center; }
.iv__legend :deep(.ml__row) { transition: opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out); }
.iv__legend--tut :deep(.ml__row:last-child),
.iv__legend--live :deep(.ml__row:first-child) { opacity: 0.35; }
.iv__legend--tut :deep(.ml__row:first-child),
.iv__legend--live :deep(.ml__row:last-child) { transform: scale(1.08); }
.iv__hoppa { position: absolute; bottom: 0.3rem; left: 50%; transform: translateX(-50%); white-space: nowrap; font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.06em; color: var(--color-ink-muted); opacity: 0.7; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .iv__vantar { animation: none; }
  .iv__legend :deep(.ml__row) { transition: opacity 0.2s ease; }
  .iv__legend--tut :deep(.ml__row:first-child),
  .iv__legend--live :deep(.ml__row:last-child) { transform: none; }
}
</style>
