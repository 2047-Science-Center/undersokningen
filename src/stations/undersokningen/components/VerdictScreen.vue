<script setup lang="ts">
/**
 * Utlåtande — fallet löst (alla patogener identifierade) eller förlorat
 * (exponeringen full). Visar lösta prov + exponering. NOLLSTÄLL tar stationen
 * tillbaka till attract för nästa grupp.
 */
import { computed } from 'vue'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Icon from './Icon.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const won = computed(() => store.outcome === 'win')
</script>

<template>
  <div class="verdict" :class="won ? 'verdict--win' : 'verdict--lost'">
    <Icon :name="won ? 'prov' : 'exponering'" :size="64" />
    <h1 class="verdict__title">{{ won ? t('verdict.win_title') : t('verdict.lost_title') }}</h1>
    <p class="verdict__sub">{{ won ? t('verdict.win_sub') : t('verdict.lost_sub') }}</p>
    <dl class="verdict__stats mono">
      <div>
        <dt>{{ t('progress.title') }}</dt>
        <dd>{{ t('verdict.solved', { solved: store.solvedCount, total: store.totalCount }) }}</dd>
      </div>
      <div>
        <dt>{{ t('exposure.title') }}</dt>
        <dd>{{ t('verdict.exposure', { n: store.exposure }) }}</dd>
      </div>
    </dl>
    <button v-if="store.leader" class="crt-button crt-button--strong" @click="store.reset()">
      {{ t('verdict.again') }}
    </button>
    <p v-else class="verdict__wait">{{ t('common.waiting') }}</p>
  </div>
</template>

<style scoped>
.verdict {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  height: 100%;
  text-align: center;
  padding: 2rem;
}
.verdict__title {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 4rem);
  letter-spacing: 0.08em;
}
.verdict--lost .verdict__title {
  color: var(--color-danger);
}
.verdict__sub {
  margin: 0;
  max-width: 40ch;
  font-family: var(--font-mono);
  color: var(--color-ink-muted);
}
.verdict__stats {
  display: flex;
  gap: 2.5rem;
  margin: 0.5rem 0 1rem;
}
.verdict__stats dt {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.08em;
}
.verdict__stats dd {
  margin: 0.2rem 0 0;
  font-size: 1.3rem;
  color: var(--color-ink-strong);
}
.verdict__wait {
  font-family: var(--font-mono);
  color: var(--color-ink-muted);
}
</style>
