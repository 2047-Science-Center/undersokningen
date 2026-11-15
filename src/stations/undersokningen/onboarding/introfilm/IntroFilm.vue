<script setup lang="ts">
/**
 * INTROFILM — onboarding-filmen (fas 2, ersätter referensfallet). 3GS/Three.js-
 * scenen renderas i canvas; VO-captionen + trogna UI-kort läggs ovanpå. Spelas
 * identiskt på båda skärmarna. Berättarröst spelas in senare — tills dess visas
 * VO:n som text. Hoppa-över finns alltid.
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { createIntroScene, type IntroScene } from './introScene'
import { FILM, FILM_TOTAL, beatAt, type FilmBeat } from './introFilm'
import { REF_CASE, LOG } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'

const emit = defineEmits<{ done: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const beat = ref<FilmBeat>(FILM[0])
const beatIndex = ref(0)
const done = ref(false)
let scene: IntroScene | null = null
let raf = 0
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let startAt = 0
let lastBeatId = ''

const ui = computed(() => beat.value.ui ?? null)
const dana = REF_CASE.dana
const circledLog = REF_CASE.log.find((l) => l.circle)

function accent(): string {
  return getComputedStyle(canvas.value!).getPropertyValue('--color-primary').trim() || '#ffa040'
}

function finish(): void {
  if (done.value) return
  done.value = true
  emit('done')
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

  startAt = performance.now()
  const tick = () => {
    const elapsed = (performance.now() - startAt) / 1000
    if (elapsed >= FILM_TOTAL) {
      scene?.render(elapsed, FILM[FILM.length - 1].id, 1)
      finish()
      return
    }
    const at = beatAt(elapsed)
    beat.value = at.beat
    beatIndex.value = at.index
    // bipp när skanna-beaten börjar
    if (at.beat.id !== lastBeatId) {
      lastBeatId = at.beat.id
      if (at.beat.id === 'skanna') audio.play('popup')
      else if (at.beat.id !== 'open') audio.play('blip')
    }
    scene?.render(elapsed, at.beat.id, at.progress)
    raf = requestAnimationFrame(tick)
  }
  tick()
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  mo?.disconnect()
  scene?.dispose()
})
</script>

<template>
  <div class="film">
    <canvas ref="canvas" class="film__canvas" aria-label="Introfilm: så här löser ni fallet" />

    <!-- Trogna UI-kort som tonas in vid skanna/markera/sortera -->
    <Transition name="card">
      <div v-if="ui === 'scan'" key="scan" class="film__ui film__ui--scan amber-frame">
        <div class="film__kam">KAM 03 · SEKTOR C <span class="film__rec">● REC</span></div>
        <div class="film__person">
          <div class="film__avatar">{{ dana.name.charAt(0) }}</div>
          <div>
            <p class="film__id">IDENTIFIERAD SOM</p>
            <p class="film__name">{{ dana.name }}</p>
            <p class="film__sig">{{ dana.clothing }} · hår: {{ dana.hair }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="ui === 'mark'" key="mark" class="film__ui film__ui--mark amber-frame">
        <div class="film__kam">{{ LOG.header.split('·')[0] }}· HÄNDELSELOGG</div>
        <p class="film__logline">
          <span class="mono">{{ circledLog?.time }}</span>
          <span class="film__circle">{{ circledLog?.text }}</span>
        </p>
        <div class="film__marks">
          <span class="film__chip film__chip--yes">✓ Misstänkt</span>
          <span class="film__chip film__chip--no">Icke misstänkt</span>
        </div>
      </div>

      <div v-else-if="ui === 'sort'" key="sort" class="film__ui film__ui--sort amber-frame">
        <div class="film__kam">LABBKONSOL · HÅRKLASSER</div>
        <div class="film__baskets">
          <span class="film__basket film__basket--on">Människohår</span>
          <span class="film__basket">Djurhår</span>
          <span class="film__basket">Syntet / fiber</span>
        </div>
      </div>
    </Transition>

    <!-- VO-caption -->
    <div class="film__vo">
      <p class="film__votext">{{ beat.vo }}</p>
      <div class="film__dots">
        <span v-for="(b, i) in FILM" :key="b.id" class="film__dot" :class="{ 'film__dot--on': i <= beatIndex }" />
      </div>
    </div>

    <button class="film__skip crt-button" @click="finish">Hoppa över ▸</button>
  </div>
</template>

<style scoped>
.film { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; }
.film__canvas { display: block; width: 100%; height: 100%; }

/* UI-kort (ligger över skärmens plats i scenen) */
.film__ui {
  position: absolute; top: 16%; left: 50%; transform: translateX(-50%);
  width: min(42rem, 80vw); padding: 1rem 1.2rem; background: rgba(6, 12, 10, 0.92);
  display: flex; flex-direction: column; gap: 0.7rem; backdrop-filter: blur(2px);
}
.film__kam { font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--color-ink-muted); display: flex; justify-content: space-between; }
.film__rec { color: var(--color-danger); }
.film__person { display: flex; align-items: center; gap: 1rem; }
.film__avatar { width: 3.4rem; height: 3.4rem; border-radius: 6px; display: grid; place-items: center; background: var(--color-background-2); border: 1px solid var(--color-primary-dim); font-family: var(--font-retro); font-size: 1.6rem; color: var(--color-primary); }
.film__id { margin: 0; font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.12em; color: var(--color-ink-muted); }
.film__name { margin: 0.1rem 0; font-family: var(--font-retro); font-size: 1.5rem; color: var(--color-ink-strong); }
.film__sig { margin: 0; font-family: var(--font-mono); font-size: 0.82rem; color: var(--color-primary); }
.film__logline { margin: 0; display: flex; gap: 0.6rem; align-items: baseline; font-size: 1rem; color: var(--color-ink-strong); }
.film__circle { padding: 0.15rem 0.4rem; border: 2px solid var(--color-danger); border-radius: 40% 60% 55% 45%; color: var(--color-ink-strong); }
.film__marks, .film__baskets { display: flex; gap: 0.6rem; justify-content: center; }
.film__chip, .film__basket { font-family: var(--font-retro); font-size: 0.95rem; padding: 0.35rem 0.8rem; border: 1px solid var(--color-primary-dim); border-radius: 6px; color: var(--color-ink-muted); }
.film__chip--yes { border-color: var(--color-primary); color: var(--color-primary); box-shadow: var(--glow-soft); }
.film__chip--no { opacity: 0.6; }
.film__basket--on { border-color: var(--color-primary); color: var(--color-primary); box-shadow: var(--glow-soft); }

/* VO-caption */
.film__vo { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.2rem clamp(1rem, 5vw, 4rem) 1.6rem; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; background: linear-gradient(to top, rgba(3, 8, 6, 0.9), rgba(3, 8, 6, 0)); }
.film__votext { margin: 0; max-width: 46ch; text-align: center; font-family: var(--font-retro); font-size: clamp(1.1rem, 2.4vw, 1.7rem); line-height: 1.4; color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.film__dots { display: flex; gap: 0.4rem; }
.film__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.film__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 6px var(--color-primary); }

.film__skip { position: absolute; top: 1rem; right: 1rem; font-size: 0.9rem; padding: 0.4em 1em; opacity: 0.8; }

.card-enter-active, .card-leave-active { transition: opacity 0.4s var(--ease-out), transform 0.4s var(--ease-out); }
.card-enter-from, .card-leave-to { opacity: 0; transform: translate(-50%, 10px); }
.card-enter-to, .card-leave-from { transform: translateX(-50%); }

@media (prefers-reduced-motion: reduce) {
  .card-enter-active, .card-leave-active { transition: opacity 0.2s ease; }
}
</style>
