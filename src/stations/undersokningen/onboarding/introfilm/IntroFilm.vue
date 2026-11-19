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

const ui = computed(() => beat.value.ui ?? null)

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

.screen-enter-active, .screen-leave-active { transition: opacity 0.5s var(--ease-out); }
.screen-enter-from, .screen-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .screen-enter-active, .screen-leave-active { transition: opacity 0.2s ease; }
}
</style>
