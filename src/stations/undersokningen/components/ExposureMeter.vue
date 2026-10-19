<script setup lang="ts">
/**
 * Delad exponeringsmätare — syns i BÅDA valv. Fyllda segment = exponering,
 * readout i display-fonten (VT323). Når den taket är fallet förlorat. Status
 * bärs av IKON + form + position (inte bara färg); nära taket pulsar den i
 * --color-danger.
 */
import { computed } from 'vue'
import { useI18n } from '@/station-kit/i18n'
import Icon from './Icon.vue'

const props = defineProps<{ value: number; max: number }>()
const { t } = useI18n()

const segments = computed(() => Array.from({ length: props.max }, (_, i) => i < props.value))
const critical = computed(() => props.value >= props.max - 1 && props.value < props.max)
</script>

<template>
  <div class="exp amber-frame" :class="{ 'exp--crit': critical }">
    <div class="exp__head">
      <Icon name="exponering" :size="20" />
      <span class="exp__title">{{ t('exposure.title') }}</span>
      <span class="exp__read mono">{{ value }}/{{ max }}</span>
    </div>
    <div class="exp__bar" role="meter" :aria-valuenow="value" :aria-valuemax="max">
      <span
        v-for="(on, i) in segments"
        :key="i"
        class="exp__seg"
        :class="{ 'exp__seg--on': on }"
      />
    </div>
    <p class="exp__sub">{{ t('exposure.sub') }}</p>
  </div>
</template>

<style scoped>
.exp {
  padding: 0.7rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.exp__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.exp__title {
  font-family: var(--font-retro);
  letter-spacing: 0.08em;
  color: var(--color-ink-strong);
  flex: 1;
}
.exp__read {
  font-family: var(--font-retro);
  font-size: 1.6rem;
  color: var(--color-primary);
  text-shadow: var(--glow-strong);
}
.exp__bar {
  display: flex;
  gap: 0.35rem;
}
.exp__seg {
  flex: 1;
  height: 0.7rem;
  border: 1px solid var(--color-primary-dim);
  border-radius: 3px;
  background: transparent;
}
.exp__seg--on {
  background: var(--color-danger);
  border-color: var(--color-danger);
  box-shadow: 0 0 8px var(--color-danger);
}
.exp__sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}
.exp--crit .exp__read {
  color: var(--color-danger);
  animation: exp-pulse 0.8s ease-in-out infinite;
}
@keyframes exp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .exp--crit .exp__read { animation: none; }
}
</style>
