<script setup lang="ts">
/**
 * UPPDRAG-box — alltid synlig, kollapsbar påminnelse om rollens uppdrag.
 * Kort rad syns hela tiden (så man aldrig tappar "vad var uppdraget?"); tap
 * fäller ut hela briefingen i en flytande panel. Placeras uppe till höger i
 * konsolen. Innehåll bor i config.MISSIONS.
 */
import { ref, computed } from 'vue'
import { MISSIONS, type RoleId } from '@/config'

const props = defineProps<{ role: RoleId }>()
const mission = computed(() => MISSIONS[props.role])
const open = ref(false)
</script>

<template>
  <div class="mb" :class="{ 'mb--open': open }">
    <button class="mb__chip" :aria-expanded="open" @click="open = !open">
      <svg class="mb__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
      <span class="mb__label">UPPDRAG</span>
      <span class="mb__short">{{ mission.short }}</span>
      <span class="mb__chev" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>
    <Transition name="mb">
      <div v-if="open" class="mb__panel amber-frame">
        <p class="mb__full">{{ mission.full }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mb { position: relative; display: inline-block; max-width: min(26rem, 46vw); }
.mb__chip {
  display: flex; align-items: center; gap: 0.5rem; width: 100%; cursor: pointer; text-align: left;
  background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 10px;
  padding: 0.4rem 0.7rem; color: var(--color-ink-muted); transition: border-color 0.14s var(--ease-out);
}
.mb__chip:hover, .mb--open .mb__chip { border-color: var(--color-primary); }
.mb__mark { width: 1.1rem; height: 1.1rem; flex: none; color: var(--color-primary); }
.mb__label { font-family: var(--font-retro); font-size: 0.82rem; letter-spacing: 0.12em; color: var(--color-primary); flex: none; }
.mb__short { font-family: var(--font-mono); font-size: 0.82rem; color: var(--color-ink-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.mb__chev { margin-left: auto; color: var(--color-primary); flex: none; font-size: 0.75rem; }
.mb__panel {
  position: absolute; top: calc(100% + 0.4rem); right: 0; z-index: 60; width: min(30rem, 80vw);
  padding: 0.8rem 1rem; background: var(--color-background-2); box-shadow: var(--glow-soft);
}
.mb__full { margin: 0; font-family: var(--font-mono); font-size: 0.95rem; line-height: 1.45; color: var(--color-ink-strong); }
.mb-enter-active, .mb-leave-active { transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out); }
.mb-enter-from, .mb-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .mb-enter-active, .mb-leave-active { transition: opacity 140ms ease; }
  .mb-enter-from, .mb-leave-to { transform: none; }
}
</style>
