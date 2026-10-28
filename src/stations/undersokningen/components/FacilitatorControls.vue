<script setup lang="ts">
/**
 * Diskret facilitator-kontroll i ett hörn — finns i BÅDE pilot och drift.
 *   - Paus: fryser och lägger paus-overlay på båda skärmar.
 *   - Nollställ: tillbaka till attract (med bekräftelse).
 *   - Avsluta: stänger stationen → tillbaka till skrivbordet (med bekräftelse).
 */
import { ref } from 'vue'
import { useUndersokningenStore } from '../store/undersokningenStore'
import { useI18n } from '@/station-kit/i18n'

const store = useUndersokningenStore()
const { t } = useI18n()
const confirm = ref<'' | 'reset' | 'exit'>('')

function doReset() {
  confirm.value = ''
  store.reset()
}
function doExit() {
  confirm.value = ''
  store.quitStation()
}
</script>

<template>
  <div class="facil">
    <div v-if="confirm === 'reset'" class="facil__confirm">
      <span class="facil__confirm-q">{{ t('facil.reset_confirm') }}</span>
      <div class="facil__confirm-row">
        <button class="crt-button crt-button--danger facil__btn" @click="doReset">{{ t('facil.reset_yes') }}</button>
        <button class="crt-button facil__btn" @click="confirm = ''">{{ t('facil.cancel') }}</button>
      </div>
    </div>
    <div v-else-if="confirm === 'exit'" class="facil__confirm">
      <span class="facil__confirm-q">{{ t('facil.exit_confirm') }}</span>
      <div class="facil__confirm-row">
        <button class="crt-button crt-button--danger facil__btn" @click="doExit">{{ t('facil.exit_yes') }}</button>
        <button class="crt-button facil__btn" @click="confirm = ''">{{ t('facil.cancel') }}</button>
      </div>
    </div>
    <div v-else class="facil__row">
      <button class="crt-button facil__btn" :class="{ 'crt-button--strong': store.paused }" @click="store.togglePause()">
        {{ store.paused ? '▶ ' + t('facil.resume') : '⏸ ' + t('facil.pause') }}
      </button>
      <button class="crt-button facil__btn facil__dim" @click="confirm = 'reset'">⟲ {{ t('facil.reset') }}</button>
      <button class="crt-button facil__btn facil__dim" @click="confirm = 'exit'">✕ {{ t('facil.exit') }}</button>
    </div>
  </div>
</template>

<style scoped>
.facil { position: fixed; left: 0.75rem; bottom: 3rem; z-index: 360; font-family: var(--font-retro); }
.facil__row, .facil__confirm-row { display: flex; gap: 0.4rem; }
.facil__confirm { display: flex; flex-direction: column; gap: 0.4rem; background: var(--color-background-2); border: 1px solid var(--color-primary); border-radius: 8px; padding: 0.6rem; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); }
.facil__confirm-q { color: var(--color-ink-strong); font-size: 0.95rem; }
.facil__btn { font-size: 0.9rem; padding: 0.25em 0.7em; opacity: 0.82; }
.facil__btn:hover { opacity: 1; }
.facil__dim { color: var(--color-ink-muted); border-color: var(--color-primary-dim); }
</style>
