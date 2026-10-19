<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Provbank med kända virus + filter på särdrag. Labbet
 * HÖR fältets signalement och bockar för särdragen → banken smalnar av →
 * markera rätt virus och LÅS IN. Labbet ser ALDRIG provets särdrag direkt
 * (det tvingar fram samarbetet). Mikroskop-kameran är ett separat verktyg
 * (public/mikroskop/) bredvid — inte i spel-loopen.
 */
import { ref, computed, watch } from 'vue'
import { FEATURE_DIMS, featuresByDim, featureById, type Virus } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Icon from './Icon.vue'
import Placeholder from './Placeholder.vue'
import FeatureChip from './FeatureChip.vue'
import ExposureMeter from './ExposureMeter.vue'

const store = useUndersokningenStore()
const { t } = useI18n()

const selectedFeatures = ref<Set<string>>(new Set())
const selectedVirus = ref<string | null>(null)

function toggleFeature(id: string): void {
  const next = new Set(selectedFeatures.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedFeatures.value = next
}
function clearFilter(): void {
  selectedFeatures.value = new Set()
}

const filteredBank = computed<Virus[]>(() => {
  const sel = [...selectedFeatures.value]
  if (sel.length === 0) return store.bank
  return store.bank.filter((v) => sel.every((f) => v.features.includes(f)))
})

function selectVirus(id: string): void {
  selectedVirus.value = selectedVirus.value === id ? null : id
  store.notifyActivity()
}
function lockIn(): void {
  if (!selectedVirus.value) return
  store.confirmVirus(selectedVirus.value)
}

// Nollställ markering/filter när nytt prov blir aktivt eller provet löses.
watch(
  () => [store.activeCase?.id, store.solvedCount],
  () => {
    selectedVirus.value = null
    clearFilter()
  },
)

const feedback = computed(() => {
  const r = store.lastResult
  if (!r || r.caseId !== store.activeCase?.id) return null
  return r.correct ? 'correct' : 'wrong'
})
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <div class="lab__role">
        <Icon name="mikroskop" :size="26" />
        <div>
          <h2 class="lab__title">{{ t('lab.title') }}</h2>
          <p class="lab__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
        </div>
      </div>
      <div class="lab__progress mono">
        {{ t('progress.title') }} {{ t('progress.count', { solved: store.solvedCount, total: store.totalCount }) }}
      </div>
    </header>

    <p v-if="!store.activeCase" class="lab__waiting">
      <Icon name="scanner" :size="18" /> {{ t('lab.waiting_sample') }}
    </p>
    <p v-else class="lab__working ink-strong">
      {{ t('lab.working_on', { prov: store.activeCase.id }) }}
    </p>

    <p v-if="feedback === 'correct'" class="lab__feedback lab__feedback--ok">{{ t('lab.correct') }}</p>
    <p v-else-if="feedback === 'wrong'" class="lab__feedback lab__feedback--bad">{{ t('lab.wrong') }}</p>

    <div class="lab__body">
      <!-- Filter -->
      <aside class="lab__filter" data-tut="filter">
        <div class="lab__filter-head">
          <h3 class="lab__filter-title">{{ t('lab.filter') }}</h3>
          <button class="lab__clear" @click="clearFilter">{{ t('lab.clear_filter') }}</button>
        </div>
        <p class="lab__filter-hint">{{ t('lab.filter_hint') }}</p>
        <div v-for="dim in FEATURE_DIMS" :key="dim" class="lab__dim">
          <div class="lab__chips">
            <FeatureChip
              v-for="f in featuresByDim(dim)"
              :key="f.id"
              toggle
              :label="f.label"
              :active="selectedFeatures.has(f.id)"
              @toggle="toggleFeature(f.id)"
            />
          </div>
        </div>
      </aside>

      <!-- Bank -->
      <section class="lab__bank" data-tut="bank">
        <div class="lab__bank-head">
          <h3 class="lab__bank-title">{{ t('lab.bank') }}</h3>
          <span class="lab__count mono">{{ t('lab.matches', { n: filteredBank.length }) }}</span>
        </div>
        <div class="lab__grid">
          <button
            v-for="v in filteredBank"
            :key="v.id"
            class="lab__card amber-frame"
            :class="{ 'lab__card--sel': selectedVirus === v.id }"
            @click="selectVirus(v.id)"
          >
            <Placeholder class="lab__card-img" :path="v.image" :label="v.id" />
            <span class="lab__card-name ink-strong">{{ v.name }}</span>
            <span class="lab__card-feats">
              <span v-for="fid in v.features" :key="fid" class="lab__feat">{{ featureById(fid)?.label }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <div class="lab__foot">
      <ExposureMeter class="lab__exp" :value="store.exposure" :max="store.exposureMax" />
      <button
        class="crt-button crt-button--strong lab__lock"
        data-tut="lock"
        :disabled="!selectedVirus"
        @click="lockIn"
      >
        {{ t('lab.lock_in') }} ▸
      </button>
    </div>
  </div>
</template>

<style scoped>
.lab {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  height: 100%;
  min-height: 0;
}
.lab__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.lab__role {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.lab__title {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.06em;
}
.lab__sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}
.lab__progress {
  color: var(--color-ink-strong);
}
.lab__waiting,
.lab__working {
  margin: 0;
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.lab__waiting {
  color: var(--color-ink-muted);
}
.lab__feedback {
  margin: 0;
  font-family: var(--font-retro);
  font-size: 1.2rem;
  letter-spacing: 0.05em;
}
.lab__feedback--ok {
  color: var(--color-primary);
  text-shadow: var(--glow-strong);
}
.lab__feedback--bad {
  color: var(--color-danger);
}
.lab__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(210px, 0.8fr) minmax(0, 2fr);
  gap: 1rem;
}
.lab__filter {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  padding-right: 0.3rem;
}
.lab__filter-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.lab__filter-title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: var(--color-primary);
}
.lab__clear {
  background: transparent;
  border: none;
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
}
.lab__filter-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}
.lab__dim {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.lab__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.lab__bank {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}
.lab__bank-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.lab__bank-title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: var(--color-primary);
}
.lab__count {
  color: var(--color-ink-muted);
}
.lab__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
  overflow-y: auto;
  align-content: start;
  padding-right: 0.3rem;
}
.lab__card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  background: var(--color-background-2);
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.lab__card--sel {
  border-color: var(--color-ink-strong);
  box-shadow: 0 0 14px rgba(var(--mode-accent-rgb), 0.5);
}
.lab__card-img {
  aspect-ratio: 1 / 1;
}
.lab__card-name {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 600;
}
.lab__card-feats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.lab__feat {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-ink-muted);
  border: 1px solid var(--color-primary-dim);
  border-radius: 999px;
  padding: 0.05em 0.5em;
}
.lab__foot {
  display: flex;
  align-items: stretch;
  gap: 1rem;
}
.lab__exp {
  flex: 1;
}
.lab__lock {
  font-size: 1.4rem;
  padding: 0 2rem;
  white-space: nowrap;
}
</style>
