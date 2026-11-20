<script setup lang="ts">
/**
 * Bläddra mellan de misstänkta i helskärm (verdikt på båda skärmarna, Maddes test 2026-11-20).
 * Hela porträttet (ingen beskärning — kläder + hår = signalementet), namn, kläder, avtryck och
 * fältets loggkoppling. Pilar / svep / piltangenter byter person. Slot `actions` = knappar
 * (fältets verdikt: "VÄLJ <namn>").
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { asset, type Person } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import Icon from './Icon.vue'

export interface VisadPerson extends Person {
  count?: number
  /** Fältets loggkoppling som text ("14:10 · 14:24"), om den finns. */
  tider?: string | null
}

const props = defineProps<{ personer: VisadPerson[]; index: number | null }>()
const emit = defineEmits<{ close: []; 'update:index': [i: number] }>()
const { t } = useI18n()

const p = computed(() => (props.index == null ? null : (props.personer[props.index] ?? null)))
const flera = computed(() => props.personer.length > 1)

function steg(d: number): void {
  if (props.index == null || !props.personer.length) return
  emit('update:index', (props.index + d + props.personer.length) % props.personer.length)
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') steg(1)
  else if (e.key === 'ArrowLeft') steg(-1)
}
watch(
  () => props.index != null,
  (oppen) => (oppen ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)),
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* svep */
const startX = ref<number | null>(null)
function ned(e: PointerEvent): void {
  startX.value = e.clientX
}
function upp(e: PointerEvent): void {
  if (startX.value == null) return
  const dx = e.clientX - startX.value
  startX.value = null
  if (Math.abs(dx) > 60) steg(dx < 0 ? 1 : -1)
}
</script>

<template>
  <Transition name="pv">
    <div v-if="p" class="pv" @click.self="emit('close')">
      <button class="pv__x" :aria-label="t('common.close')" @click="emit('close')"><Icon name="close" :size="30" /></button>
      <button v-if="flera" class="pv__nav pv__nav--prev" aria-label="Föregående" @click="steg(-1)">‹</button>
      <div class="pv__body" @pointerdown="ned" @pointerup="upp">
        <img :key="p.id" class="pv__img" :src="asset(p.image)" :alt="p.name" draggable="false" />
        <div class="pv__info">
          <span class="pv__name ink-strong">{{ p.name }}</span>
          <span class="pv__line mono">{{ p.clothing }}</span>
          <span v-if="p.count != null" class="pv__line pv__line--acc mono"><Icon name="finger" :size="16" /> {{ t('falt.prints_count', { n: p.count }) }}</span>
          <span v-if="p.tider" class="pv__line pv__line--acc mono"><Icon name="logg" :size="16" /> {{ p.tider }}</span>
          <span v-if="flera" class="pv__pos mono">{{ (index ?? 0) + 1 }} / {{ personer.length }}</span>
        </div>
        <div v-if="$slots.actions" class="pv__actions"><slot name="actions" :person="p" /></div>
      </div>
      <button v-if="flera" class="pv__nav pv__nav--next" aria-label="Nästa" @click="steg(1)">›</button>
    </div>
  </Transition>
</template>

<style scoped>
.pv { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; gap: 1rem; background: rgba(2, 6, 4, 0.95); padding: 3vmin; }
.pv__body { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; max-width: 80vw; touch-action: pan-y; user-select: none; }
.pv__img { max-width: 78vw; max-height: 66vh; object-fit: contain; border: 1px solid var(--color-primary-dim); box-shadow: var(--glow-strong); background: #000; }
.pv__info { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: center; gap: 0.4rem 1.2rem; text-align: center; }
.pv__name { font-size: clamp(1.8rem, 4vw, 2.8rem); }
.pv__line { display: inline-flex; align-items: center; gap: 0.35rem; font-size: clamp(1rem, 2vw, 1.3rem); color: var(--color-ink-muted); }
.pv__line--acc { color: var(--color-primary); }
.pv__pos { font-size: 0.9rem; color: var(--color-ink-muted); }
.pv__actions { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.pv__nav {
  flex: none; width: clamp(3.2rem, 6vw, 4.6rem); height: clamp(3.2rem, 6vw, 4.6rem); border-radius: 50%;
  border: 1px solid var(--color-primary); background: var(--color-background-2); color: var(--color-primary);
  font-size: clamp(2rem, 4vw, 3rem); line-height: 1; cursor: pointer; transition: transform 0.14s var(--ease-out);
}
.pv__nav:active { transform: scale(0.92); }
.pv__x { position: absolute; top: 2vmin; right: 2vmin; background: transparent; border: none; color: var(--color-ink-strong); cursor: pointer; padding: 0.6rem; display: inline-flex; }
.pv-enter-active { transition: opacity 180ms var(--ease-out); }
.pv-leave-active { transition: opacity 140ms var(--ease-out); }
.pv-enter-from, .pv-leave-to { opacity: 0; }
</style>
