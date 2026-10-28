<script setup lang="ts">
/**
 * Coach-marks — guidad genomgång per sida vid live-start (à la Eco Loco/
 * Förhandlingen). Spotlightar en riktig ruta (via data-coach="<id>") + ett
 * kort med titel/text, man tappar för att gå vidare. Spotlighten glider mellan
 * mål. Reduced-motion = ingen puls/glidning, bara opacity.
 */
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useI18n } from '@/station-kit/i18n'

interface Step {
  target?: string
  title: string
  text: string
}
const props = defineProps<{ steps: Step[]; active: boolean }>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

const i = ref(0)
const rect = ref<{ top: number; left: number; width: number; height: number } | null>(null)

const step = computed(() => props.steps[i.value])
const isLast = computed(() => i.value >= props.steps.length - 1)

function measure(): void {
  const s = props.steps[i.value]
  const el = s?.target ? document.querySelector<HTMLElement>(`[data-coach="${s.target}"]`) : null
  if (!el) {
    rect.value = null
    return
  }
  const r = el.getBoundingClientRect()
  rect.value = { top: r.top, left: r.left, width: r.width, height: r.height }
}

function next(): void {
  if (isLast.value) {
    emit('done')
    return
  }
  i.value += 1
}

function onResize(): void {
  measure()
}

watch(
  () => props.active,
  (a) => {
    if (a) {
      i.value = 0
      void nextTick(measure)
    }
  },
)
watch(i, () => void nextTick(measure))

onMounted(() => {
  window.addEventListener('resize', onResize)
  if (props.active) void nextTick(measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const PAD = 8
const holeStyle = computed(() => {
  if (!rect.value) return null
  return {
    top: rect.value.top - PAD + 'px',
    left: rect.value.left - PAD + 'px',
    width: rect.value.width + PAD * 2 + 'px',
    height: rect.value.height + PAD * 2 + 'px',
  }
})
/** Kortet läggs under målet om det får plats, annars ovanför, annars klampat
 *  i mitten — alltid helt synligt oavsett målets storlek. */
const CARD_H = 200
const cardStyle = computed(() => {
  if (!rect.value) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  const cx = Math.min(Math.max(rect.value.left + rect.value.width / 2, 200), window.innerWidth - 200)
  const below = rect.value.top + rect.value.height + 16
  const above = rect.value.top - 16 - CARD_H
  let top: number
  if (below + CARD_H <= window.innerHeight - 8) top = below
  else if (above >= 8) top = above
  else top = Math.min(Math.max((window.innerHeight - CARD_H) / 2, 8), window.innerHeight - CARD_H - 8)
  return { top: top + 'px', left: cx + 'px', transform: 'translateX(-50%)' }
})
</script>

<template>
  <Transition name="coach">
    <div v-if="active" class="coach" @click="next">
      <div v-if="holeStyle" class="coach__hole" :style="holeStyle" />
      <div v-else class="coach__dim" />
      <div class="coach__card" :style="cardStyle" @click.stop>
        <span class="coach__step">{{ i + 1 }} / {{ steps.length }}</span>
        <h3 class="coach__title">{{ step.title }}</h3>
        <p class="coach__text">{{ step.text }}</p>
        <button class="crt-button crt-button--strong coach__btn" @click="next">
          {{ isLast ? t('coach.done') : t('coach.next') }} ▸
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.coach { position: fixed; inset: 0; z-index: 90; }
.coach__dim { position: absolute; inset: 0; background: rgba(2, 6, 4, 0.8); }
.coach__hole {
  position: absolute; border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(2, 6, 4, 0.8);
  outline: 2px solid var(--color-primary);
  transition: top 0.28s var(--ease-in-out), left 0.28s var(--ease-in-out),
    width 0.28s var(--ease-in-out), height 0.28s var(--ease-in-out);
  animation: coach-pulse 1.8s ease-in-out infinite;
}
@keyframes coach-pulse {
  0%, 100% { outline-color: var(--color-primary); }
  50% { outline-color: var(--color-primary-dim); }
}
.coach__card {
  position: absolute; z-index: 2; width: min(82vw, 30rem);
  display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.3rem;
  background: var(--color-background-2); border: 1px solid var(--color-primary); border-radius: 12px;
  box-shadow: var(--glow-soft); text-align: left;
  transition: top 0.28s var(--ease-in-out), left 0.28s var(--ease-in-out);
}
.coach__step { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.12em; color: var(--color-primary); }
.coach__title { margin: 0; font-size: clamp(1.3rem, 2.6vw, 1.8rem); letter-spacing: 0.03em; }
.coach__text { margin: 0; font-family: var(--font-mono); font-size: clamp(0.95rem, 1.8vw, 1.15rem); line-height: 1.4; color: var(--color-ink-strong); }
.coach__btn { align-self: flex-start; margin-top: 0.4rem; }
.coach-enter-active { transition: opacity 220ms var(--ease-out); }
.coach-leave-active { transition: opacity 160ms var(--ease-out); }
.coach-enter-from, .coach-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .coach__hole { animation: none; transition: none; }
  .coach__card { transition: none; }
}
</style>
