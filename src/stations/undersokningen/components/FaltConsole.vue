<script setup lang="ts">
/**
 * FÄLTKONSOL (roll B). Scanna ytan → provets SIGNALEMENT (bild + särdrags-chips)
 * som ska läsas upp för labbet. Fältet ser provet, labbet gör det inte — det är
 * samarbetssömmen. Flera prov per omgång. Pilot: skärmknappar mockar scannern.
 */
import { computed } from 'vue'
import { config, featureById } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Icon from './Icon.vue'
import Placeholder from './Placeholder.vue'
import FeatureChip from './FeatureChip.vue'
import ExposureMeter from './ExposureMeter.vue'

const store = useUndersokningenStore()
const { t } = useI18n()

const isPilot = config.mode === 'pilot'

const activeFeatures = computed(() =>
  (store.activeCase?.features ?? []).map((id) => featureById(id)?.label ?? id),
)
</script>

<template>
  <div class="falt">
    <header class="falt__head">
      <div class="falt__role">
        <Icon name="uv" :size="26" />
        <div>
          <h2 class="falt__title">{{ t('falt.title') }}</h2>
          <p class="falt__sub">{{ t('role.falt') }} · {{ t('valv.nord') }}</p>
        </div>
      </div>
      <div class="falt__progress mono">
        <span v-if="store.mqttOn" class="falt__seam">◉ {{ t('seam.mqtt_on') }}</span>
        {{ t('progress.title') }} {{ t('progress.count', { solved: store.solvedCount, total: store.totalCount }) }}
      </div>
    </header>

    <!-- Okänd tagg: visa UID så man kan mappa den i config -->
    <div v-if="store.lastUnknownTag" class="falt__unknown">
      <Icon name="scanner" :size="18" />
      <span class="mono">{{ t('falt.unknown_tag', { uid: store.lastUnknownTag }) }}</span>
      <span class="falt__unknown-hint">{{ t('falt.unknown_hint') }}</span>
    </div>

    <!-- Aktivt prov: signalement -->
    <section v-if="store.activeCase" class="falt__sample">
      <Placeholder class="falt__img" :path="store.activeCase.image" :label="t('falt.sample') + ' ' + store.activeCase.id" />
      <div class="falt__sig" data-tut="signalement">
        <h3 class="falt__sig-title">{{ t('falt.signalement') }}</h3>
        <div class="falt__chips">
          <FeatureChip v-for="(f, i) in activeFeatures" :key="i" :label="f" />
        </div>
        <p class="falt__report ink-strong" data-tut="report">{{ t('falt.report') }}</p>
        <p class="falt__report-hint">{{ t('falt.report_hint') }}</p>
      </div>
    </section>

    <section v-else class="falt__empty">
      <Icon name="scanner" :size="40" />
      <p>{{ t('falt.no_sample') }}</p>
      <p class="falt__scan-hint">{{ t('falt.scan_hint') }}</p>
    </section>

    <!-- Scanna-ytan-knappar (pilot mockar scannern) -->
    <section v-if="isPilot" class="falt__scanrow" :aria-label="t('falt.scan_surface')">
      <button
        v-for="(c, i) in store.caseStatuses"
        :key="c.id"
        class="crt-button falt__scanbtn"
        :class="{ 'falt__scanbtn--active': c.active, 'falt__scanbtn--solved': c.solved }"
        :disabled="c.solved"
        data-tut="scan"
        @click="store.scanCase(c.id)"
      >
        <Icon name="prov" :size="18" />
        {{ c.solved ? t('falt.solved') : t('falt.scan_spot', { n: i + 1 }) }}
      </button>
    </section>

    <ExposureMeter :value="store.exposure" :max="store.exposureMax" />
  </div>
</template>

<style scoped>
.falt {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}
.falt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.falt__role {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.falt__title {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.06em;
}
.falt__sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}
.falt__progress {
  color: var(--color-ink-strong);
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.falt__seam {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-primary);
  letter-spacing: 0.04em;
}
.falt__unknown {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--color-danger);
  border-radius: 10px;
  color: var(--color-danger);
}
.falt__unknown-hint {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}
.falt__sample {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
}
.falt__img {
  max-height: 46vh;
}
.falt__sig {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.falt__sig-title {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}
.falt__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.falt__report {
  margin: 0.6rem 0 0;
  font-family: var(--font-mono);
  font-size: 1.05rem;
}
.falt__report-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}
.falt__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  text-align: center;
}
.falt__scan-hint {
  margin: 0;
  font-size: 0.85rem;
}
.falt__scanrow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.falt__scanbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.falt__scanbtn--active {
  color: var(--color-ink-strong);
  border-color: var(--color-ink-strong);
}
.falt__scanbtn--solved {
  opacity: 0.5;
}
</style>
