<script setup lang="ts">
/** Sync-barriär: "Väntar på andra valvet". Blinkande prick + text. */
import { useI18n } from '@/station-kit/i18n'
const { t } = useI18n()
</script>

<template>
  <div class="bw">
    <span class="bw__dot crt-caret" aria-hidden="true">●</span>
    <span class="bw__text">{{ t('onb.wait_other') }}</span>
  </div>
</template>

<style scoped>
.bw {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-ink-muted);
  padding: 1rem;
}
.bw__dot {
  color: var(--color-primary);
}
</style>
