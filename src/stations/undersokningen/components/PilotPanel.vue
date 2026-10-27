<script setup lang="ts">
/** Pilotpanel (⚙, bara i pilotläge). Byt vy, starta fallet, nollställ. */
import { ref } from 'vue'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore, type ViewSide } from '../store/undersokningenStore'

const store = useUndersokningenStore()
const { t } = useI18n()
const open = ref(false)
const views: { id: ViewSide; key: string }[] = [
  { id: 'lag1', key: 'pilot.view.lag1' },
  { id: 'lag2', key: 'pilot.view.lag2' },
  { id: 'shared', key: 'pilot.view.shared' },
]
</script>

<template>
  <div class="pp">
    <button class="pp__cog crt-button" :aria-expanded="open" @click="open = !open">⚙</button>
    <div v-if="open" class="pp__panel amber-frame">
      <h3 class="pp__title">{{ t('pilot.title') }}</h3>
      <label class="pp__label">{{ t('pilot.view') }}</label>
      <div class="pp__row">
        <button v-for="v in views" :key="v.id" class="crt-button pp__btn" :class="{ 'pp__btn--on': store.view === v.id }" @click="store.setView(v.id)">
          {{ t(v.key) }}
        </button>
      </div>
      <div class="pp__row">
        <button class="crt-button crt-button--strong pp__btn" @click="store.startLive()">{{ t('pilot.start_live') }}</button>
        <button class="crt-button crt-button--danger pp__btn" @click="store.reset()">{{ t('pilot.reset') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp { position: fixed; right: 0.8rem; bottom: 0.8rem; z-index: 300; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.pp__cog { font-size: 1.2rem; padding: 0.2em 0.5em; }
.pp__panel { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.9rem; background: var(--color-background-2); min-width: 240px; }
.pp__title { margin: 0; font-size: 1rem; letter-spacing: 0.08em; color: var(--color-primary); }
.pp__label { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); }
.pp__row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pp__btn { font-size: 0.95rem; padding: 0.3em 0.7em; }
.pp__btn--on { color: var(--color-ink-strong); border-color: var(--color-ink-strong); }
</style>
