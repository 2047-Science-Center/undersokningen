<script setup lang="ts">
/**
 * INTROFILM — 3GS/Three.js-scenen över stationen, med trogna UI-kort ovanpå. Spelas
 * identiskt på båda skärmarna. Klockan ägs av VALdi-introt (IntroVo.vue): `tid` = sekunder
 * sedan filmens start, så bilden följer rösten. Undertexten ritas av IntroVo (station-kit).
 */
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { createIntroScene, type IntroScene } from './introScene'
import FilmScreen from './FilmScreen.vue'
import { FILM, FILM_TOTAL, beatAt, type FilmBeat } from './introFilm'
import { audio } from '@/station-kit/audio/AudioEngine'
import { FILM_START, fasVid } from '../introvo/introVo'

/** Stegkortet (Josef 2026-11-26: man förstod inte att det är steg man går igenom) — samma platser som i spelet. */
const FASER = {
  falt: [
    { id: 'falt1', steg: '1', namn: 'Brottsplatsen', gor: 'Samla avtryck i bevispåsarna' },
    { id: 'falt2', steg: '2', namn: 'Utredningsbordet', gor: 'En person i taget: ringa in och stämpla' },
  ],
  labb: [
    { id: 'labb1', steg: '1', namn: 'Mikroskopbordet', gor: 'Sortera de sex hårproven' },
    { id: 'labb2', steg: '2', namn: 'Ljusbordet', gor: 'Färg på varje människohår' },
    { id: 'labb3', steg: '3', namn: 'Rörposten', gor: 'Matcha håret mot de misstänkta' },
  ],
} as const
const TAVLAN = { id: 'tavlan', steg: '★', namn: 'Tavlan', gor: 'Båda sätter sin nål — på samma person' }

const props = defineProps<{
  /** Sekunder sedan filmens start (introts delade klocka). */
  tid: number
  /** Spela beat-blippar (bara fönstret som äger stationens högtalare). */
  sfx?: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const beat = ref<FilmBeat>(FILM[0])
const progress = ref(0)
let scene: IntroScene | null = null
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let lastBeatId = ''

// De gamla UI-korten visade konsolen före stegflödet → av tills de ritats om som platserna (se
// docs/bestallning-introfilm-3js-stegflode.md). Stegkortet nedan visar var i flödet filmen är.
const ui = computed(() => null as FilmBeat['ui'] | null)
const fas = computed(() => fasVid(props.tid + FILM_START))
const aktivt = computed(() => {
  const id = fas.value
  if (!id) return null
  if (id === 'tavlan') return { sida: 'TILLSAMMANS', ...TAVLAN }
  const falt = FASER.falt.find((f) => f.id === id)
  if (falt) return { sida: 'FÄLTET', ...falt }
  const labb = FASER.labb.find((f) => f.id === id)
  return labb ? { sida: 'LABBET', ...labb } : null
})

function accent(): string {
  return getComputedStyle(canvas.value!).getPropertyValue('--color-primary').trim() || '#ffa040'
}

function rita(t: number): void {
  const at = beatAt(Math.min(Math.max(0, t), FILM_TOTAL))
  beat.value = at.beat
  progress.value = at.progress
  if (at.beat.id !== lastBeatId) {
    const forsta = lastBeatId === ''
    lastBeatId = at.beat.id
    if (props.sfx && !forsta) audio.play(at.beat.id === 'skanna' ? 'popup' : 'blip')
  }
  scene?.render(t, at.beat.id, at.progress)
}

onMounted(() => {
  const el = canvas.value!
  scene = createIntroScene(el)
  scene.setAccent(accent())
  scene.resize(el.clientWidth, el.clientHeight)
  ro = new ResizeObserver(() => scene?.resize(el.clientWidth, el.clientHeight))
  ro.observe(el)
  mo = new MutationObserver(() => scene?.setAccent(accent()))
  mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-mode'] })
  rita(props.tid)
})
watch(() => props.tid, rita)
onUnmounted(() => {
  ro?.disconnect()
  mo?.disconnect()
  scene?.dispose()
})
</script>

<template>
  <div class="film">
    <canvas ref="canvas" class="film__canvas" aria-label="Introfilm: så här löser ni fallet" />

    <!-- Stegkortet: vilken plats filmen visar + alla stegen per sida (samma som platsremsan i spelet) -->
    <Transition name="screen">
      <div v-if="aktivt" class="film__steg">
        <div :key="aktivt.id" class="film__kort">
          <span class="film__kort-sida mono">{{ aktivt.sida }} · {{ aktivt.steg === '★' ? 'SIST' : 'STEG ' + aktivt.steg }}</span>
          <span class="film__kort-namn">{{ aktivt.namn.toUpperCase() }}</span>
          <span class="film__kort-gor">{{ aktivt.gor }}</span>
        </div>
        <div class="film__rader mono">
          <div class="film__rad"><b>FÄLTET</b>
            <span v-for="f in FASER.falt" :key="f.id" :class="{ 'film__chip--on': fas === f.id }" class="film__chip">{{ f.steg }} {{ f.namn }}</span>
            <span class="film__chip" :class="{ 'film__chip--on': fas === 'tavlan' }">★ Tavlan</span>
          </div>
          <div class="film__rad"><b>LABBET</b>
            <span v-for="f in FASER.labb" :key="f.id" :class="{ 'film__chip--on': fas === f.id }" class="film__chip">{{ f.steg }} {{ f.namn }}</span>
            <span class="film__chip" :class="{ 'film__chip--on': fas === 'tavlan' }">★ Tavlan</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Spelarnas skärm (trogen kopia) som tonas in vid skanna/markera/sortera -->
    <Transition name="screen">
      <div v-if="ui" :key="ui === 'sort' ? 'labb' : 'falt'" class="film__screen">
        <FilmScreen :mode="ui" :progress="progress" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.film { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; }
.film__canvas { display: block; width: 100%; height: 100%; }

/* Spelarnas skärm (kopia) ovanför undertexten */
.film__screen { position: absolute; top: 2%; left: 3%; right: 3%; bottom: 50%; } /* övre halvan; 3D-gubben syns under (introScene flyttar ner bilden) */

.film__steg { position: absolute; top: 3%; left: 3%; display: flex; flex-direction: column; gap: 0.6rem; pointer-events: none; }
.film__kort { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 1.1rem; border: 2px solid var(--color-primary); border-radius: 12px;
  background: rgba(5, 16, 11, 0.86); box-shadow: var(--glow-soft); animation: film-kort 420ms cubic-bezier(0.2, 1.4, 0.4, 1) both; }
.film__kort-sida { font-size: clamp(0.8rem, 1.3vw, 1.05rem); letter-spacing: 0.14em; color: var(--color-primary); }
.film__kort-namn { font-family: var(--font-retro); font-size: clamp(1.8rem, 3.6vw, 3rem); line-height: 1; color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.film__kort-gor { font-family: var(--font-mono); font-size: clamp(0.85rem, 1.4vw, 1.15rem); color: var(--color-ink-strong); }
.film__rader { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.45rem 0.7rem; border-radius: 10px; background: rgba(5, 16, 11, 0.7);
  font-size: clamp(0.7rem, 1.1vw, 0.9rem); color: var(--color-ink-muted); }
.film__rad { display: flex; gap: 0.6rem; align-items: center; }
.film__rad b { width: 4.6rem; color: var(--color-ink-strong); font-weight: 600; }
.film__chip { padding: 0.05em 0.5em; border: 1px solid transparent; border-radius: 6px; }
.film__chip--on { color: var(--color-background); background: var(--color-primary); }
@keyframes film-kort { from { opacity: 0; transform: translateY(-8px) scale(0.96); } to { opacity: 1; transform: none; } }
.screen-enter-active, .screen-leave-active { transition: opacity 0.5s var(--ease-out); }
.screen-enter-from, .screen-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .screen-enter-active, .screen-leave-active { transition: opacity 0.2s ease; }
}
</style>
