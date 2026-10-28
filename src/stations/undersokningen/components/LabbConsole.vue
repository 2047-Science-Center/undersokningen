<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Mikroskopet överst; operatören FRYSER ett hårstrå →
 * stillbild → DRAR den till en av tre hårkategori-containrar. Placerade bilder
 * kan öppnas i helskärm. Coach-marks introducerar uppdraget vid live-start.
 *
 * Bilderna är LOKALA för labb-fönstret (skickas aldrig över reläet — tungt).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { HAIR_CLASSES, type HairClassId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Microscope from './Microscope.vue'
import Icon from './Icon.vue'
import Lightbox from './Lightbox.vue'
import CoachMarks from './CoachMarks.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const verdicting = computed(() => store.phase === 'verdict')

interface Placed { id: string; src: string; category: HairClassId }
let seq = 0
const pending = ref<{ id: string; src: string } | null>(null)
const placed = ref<Placed[]>([])
const lightboxSrc = ref<string | null>(null)

function onCapture(src: string): void {
  // En frysning i taget att sortera: ersätt ev. osorterad fångst.
  pending.value = { id: 'spec-' + seq++, src }
  store.notifyActivity()
}
function placedIn(cat: HairClassId): Placed[] {
  return placed.value.filter((p) => p.category === cat)
}

/* ---- pointer-drag (touch-vänligt, ingen HTML5 DnD) ---- */
const drag = ref<{ src: string; x: number; y: number } | null>(null)
const overCat = ref<HairClassId | null>(null)

function catUnder(x: number, y: number): HairClassId | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')
  return (el?.dataset.drop as HairClassId) ?? null
}
function onMove(e: PointerEvent): void {
  if (!drag.value) return
  drag.value = { ...drag.value, x: e.clientX, y: e.clientY }
  overCat.value = catUnder(e.clientX, e.clientY)
}
function onUp(e: PointerEvent): void {
  const cat = catUnder(e.clientX, e.clientY)
  if (cat && pending.value) {
    placed.value.push({ id: pending.value.id, src: pending.value.src, category: cat })
    pending.value = null
    store.notifyActivity()
  }
  drag.value = null
  overCat.value = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}
function startDrag(e: PointerEvent): void {
  if (!pending.value) return
  drag.value = { src: pending.value.src, x: e.clientX, y: e.clientY }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

/* ---- coach-marks (per sida, en gång vid live-start) ---- */
const singleSide = computed(() => store.view !== 'shared')
const coachActive = ref(false)
let coachSeen = false
const coachSteps = computed(() => [
  { target: 'scope', title: t('coach.lab_scan_title'), text: t('coach.lab_scan_text') },
  { target: 'categories', title: t('coach.lab_mission_title'), text: t('coach.lab_mission_text') },
  { target: 'freeze', title: t('coach.lab_freeze_title'), text: t('coach.lab_freeze_text') },
  { target: 'categories', title: t('coach.lab_drag_title'), text: t('coach.lab_drag_text') },
  { title: t('coach.lab_help_title'), text: t('coach.lab_help_text') },
])
function maybeCoach(): void {
  if (store.onbStage === 'live' && store.phase === 'investigate' && !coachSeen && singleSide.value) {
    coachSeen = true
    coachActive.value = true
  }
}
watch(() => [store.onbStage, store.phase], maybeCoach)
onMounted(maybeCoach)
watch(
  () => store.resetSignal,
  () => {
    coachSeen = false
    coachActive.value = false
    pending.value = null
    placed.value = []
  },
)
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <Icon name="mikroskop" :size="26" />
      <div>
        <h2 class="lab__title">{{ t('lab.title') }}</h2>
        <p class="lab__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
      </div>
    </header>

    <p class="lab__hint">{{ t('lab.mission') }}</p>

    <Microscope class="lab__scope" data-coach="scope" @capture="onCapture" />

    <!-- Senaste frysta fångst — dra den till en kategori -->
    <Transition name="pending">
      <div v-if="pending" class="lab__pending">
        <div
          class="lab__chip" :class="{ 'lab__chip--dragging': drag }"
          @pointerdown.prevent="startDrag"
        >
          <img :src="pending.src" alt="" class="lab__chip-img" />
          <Icon name="finger" :size="16" class="lab__chip-grab" />
        </div>
        <span class="lab__pending-hint">{{ t('lab.capture_hint') }}</span>
      </div>
    </Transition>

    <!-- Tre hårkategori-containrar (drop-mål) -->
    <section class="lab__classes" data-coach="categories">
      <div
        v-for="c in HAIR_CLASSES" :key="c.id" class="lab__class amber-frame"
        :class="{ 'lab__class--over': overCat === c.id }" :data-drop="c.id"
      >
        <div class="lab__class-head">
          <Icon :name="c.icon" :size="26" />
          <span class="lab__class-label ink-strong">{{ c.label }}</span>
          <span class="lab__class-text">{{ c.text }}</span>
        </div>
        <div class="lab__class-grid">
          <button
            v-for="p in placedIn(c.id)" :key="p.id" class="lab__thumb" :title="t('lab.tap_fullscreen')"
            @click="lightboxSrc = p.src"
          >
            <img :src="p.src" alt="" />
          </button>
          <span v-if="!placedIn(c.id).length" class="lab__class-empty">{{ t('lab.empty_class') }}</span>
        </div>
      </div>
    </section>

    <!-- Vid verdikt: peka användaren till fält-skärmen -->
    <div v-if="verdicting" class="lab__verdict">
      <Icon name="person" :size="48" />
      <p class="lab__verdict-big">{{ t('lab.answer_other') }}</p>
      <p class="lab__verdict-sub">{{ t('lab.help_other') }}</p>
    </div>

    <!-- Drag-spöke -->
    <div v-if="drag" class="lab__ghost" :style="{ left: drag.x + 'px', top: drag.y + 'px' }">
      <img :src="drag.src" alt="" />
    </div>

    <CoachMarks :steps="coachSteps" :active="coachActive" @done="coachActive = false" />
    <Lightbox :src="lightboxSrc" :label="t('lab.title')" @close="lightboxSrc = null" />
  </div>
</template>

<style scoped>
.lab { display: flex; flex-direction: column; gap: 0.6rem; height: 100%; min-height: 0; position: relative; }
.lab__head { display: flex; align-items: center; gap: 0.7rem; }
.lab__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.lab__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__hint { margin: 0; font-family: var(--font-mono); font-size: 0.9rem; color: var(--color-ink-muted); }
.lab__scope { flex: 1 1 auto; min-height: 200px; }

.lab__pending { display: flex; align-items: center; gap: 0.7rem; }
.lab__chip {
  position: relative; width: 4.5rem; height: 3.4rem; border: 2px solid var(--color-primary); border-radius: 8px;
  overflow: hidden; cursor: grab; touch-action: none; box-shadow: var(--glow-soft);
  transition: transform 0.14s var(--ease-out);
}
.lab__chip:active { cursor: grabbing; transform: scale(0.97); }
.lab__chip--dragging { opacity: 0.4; }
.lab__chip-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lab__chip-grab { position: absolute; right: 2px; bottom: 2px; color: var(--color-primary); }
.lab__pending-hint { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-primary); }

.lab__classes { flex: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.lab__class {
  display: flex; flex-direction: column; gap: 0.4rem; padding: 0.6rem; background: var(--color-background-2);
  transition: border-color 0.14s var(--ease-out), background 0.14s var(--ease-out);
}
.lab__class--over { border-color: var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.12); }
.lab__class-head { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; text-align: center; }
.lab__class-label { font-family: var(--font-retro); letter-spacing: 0.04em; }
.lab__class-text { font-family: var(--font-mono); font-size: 0.74rem; color: var(--color-ink-muted); }
.lab__class-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; min-height: 2.6rem; align-content: flex-start; justify-content: center; }
.lab__thumb {
  width: 3.1rem; height: 2.4rem; padding: 0; border: 1px solid var(--color-primary-dim); border-radius: 5px;
  overflow: hidden; cursor: pointer; background: #000; transition: transform 0.14s var(--ease-out);
  opacity: 0; transform: scale(0.9); animation: thumb-in 220ms var(--ease-out) forwards;
}
.lab__thumb:active { transform: scale(0.95); }
.lab__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lab__class-empty { align-self: center; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-muted); opacity: 0.6; }
@keyframes thumb-in { to { opacity: 1; transform: scale(1); } }

.lab__ghost {
  position: fixed; z-index: 95; width: 4.5rem; height: 3.4rem; margin: -1.7rem 0 0 -2.25rem;
  border: 2px solid var(--color-primary); border-radius: 8px; overflow: hidden; pointer-events: none;
  box-shadow: var(--glow-strong); transform: rotate(-3deg);
}
.lab__ghost img { width: 100%; height: 100%; object-fit: cover; display: block; }

.lab__verdict {
  position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem; text-align: center;
  background: rgba(3, 9, 6, 0.9); padding: 2rem; color: var(--color-primary);
}
.lab__verdict-big { margin: 0; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: 0.05em; text-shadow: var(--glow-strong); }
.lab__verdict-sub { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); max-width: 34ch; }

.pending-enter-active { transition: opacity 200ms var(--ease-out); }
.pending-enter-active .lab__chip { transition: transform 240ms var(--ease-out); }
.pending-enter-from { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .lab__thumb { animation: none; opacity: 1; transform: none; }
}
</style>
