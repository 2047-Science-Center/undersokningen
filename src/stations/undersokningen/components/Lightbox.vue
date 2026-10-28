<script setup lang="ts">
/**
 * Helskärms-lightbox för sparade bilder (hårfångst på labb, misstänkt-foton på
 * fält). Modal → center-origin (Emil: modaler stannar centrerade). Skala in
 * 0.92→1 + opacity, exit snabbare än enter. Esc/klick utanför stänger.
 */
import { watch, onBeforeUnmount } from 'vue'
import { useI18n } from '@/station-kit/i18n'
import Icon from './Icon.vue'

const props = defineProps<{ src: string | null; label?: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}
watch(
  () => props.src,
  (v) => {
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="lb">
    <div v-if="src" class="lb" @click.self="emit('close')">
      <button class="lb__x" :aria-label="t('common.close')" @click="emit('close')"><Icon name="close" :size="30" /></button>
      <img class="lb__img" :src="src" :alt="label || ''" />
      <span v-if="label" class="lb__label">{{ label }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.lb {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;
  background: rgba(2, 6, 4, 0.94); padding: 3vmin;
}
.lb__img {
  max-width: 94vw; max-height: 82vh; object-fit: contain;
  border: 1px solid var(--color-primary-dim); box-shadow: var(--glow-strong);
}
.lb__label { font-family: var(--font-retro); letter-spacing: 0.06em; color: var(--color-primary); font-size: clamp(1.1rem, 2.4vw, 1.6rem); }
.lb__x {
  position: absolute; top: 2vmin; right: 2vmin;
  background: transparent; border: none; color: var(--color-ink-strong); cursor: pointer;
  padding: 0.6rem; display: inline-flex; border-radius: 50%; transition: transform 0.14s var(--ease-out);
}
.lb__x:active { transform: scale(0.9); }
.lb-enter-active { transition: opacity 180ms var(--ease-out); }
.lb-enter-active .lb__img { transition: transform 220ms var(--ease-out), opacity 220ms var(--ease-out); }
.lb-leave-active { transition: opacity 140ms var(--ease-out); }
.lb-enter-from, .lb-leave-to { opacity: 0; }
.lb-enter-from .lb__img { transform: scale(0.92); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .lb-enter-active .lb__img { transition: opacity 180ms ease; }
  .lb-enter-from .lb__img { transform: none; }
}
</style>
