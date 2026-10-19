<script setup lang="ts">
/**
 * Särdrags-chip. Visningsläge (fältets signalement, statiskt) eller togglebart
 * (labbets filter). Markering bärs av form/ram + bock — inte bara färg.
 */
defineProps<{ label: string; active?: boolean; toggle?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <component
    :is="toggle ? 'button' : 'span'"
    class="chip"
    :class="{ 'chip--active': active, 'chip--toggle': toggle }"
    @click="toggle && emit('toggle')"
  >
    <span v-if="toggle" class="chip__box" aria-hidden="true">{{ active ? '✓' : '' }}</span>
    <span class="chip__label">{{ label }}</span>
  </component>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3em 0.7em;
  border: 1px solid var(--color-primary-dim);
  border-radius: 999px;
  background: var(--color-background-2);
  color: var(--color-ink-strong);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
.chip--toggle {
  cursor: pointer;
}
.chip--toggle:hover {
  border-color: var(--color-primary);
}
.chip--active {
  border-color: var(--color-primary);
  box-shadow: var(--glow-soft);
  background: rgba(var(--mode-accent-rgb), 0.12);
}
.chip__box {
  width: 1.2em;
  height: 1.2em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--color-primary);
}
</style>
