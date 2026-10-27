<script setup lang="ts">
/**
 * FÄLTKONSOL (roll B). Split: fingeravtrycksyta (mock — klickbara spots) +
 * händelseloggen. Klicka ett avtryck → scan → övervakningsbild på en person
 * ("IDENTIFIERAD SOM") som kan kryssas ner. Smudge → ingen träff. "LÄMNA SVAR"
 * när som helst → verdikt.
 */
import { computed } from 'vue'
import { LOG } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Placeholder from './Placeholder.vue'
import ExposureMeter from './ExposureMeter.vue'

const store = useUndersokningenStore()
const { t } = useI18n()

const person = computed(() => store.activePerson)
const prints = computed(() => (person.value ? (store.state.scanCounts[person.value.id] ?? 0) : 0))
</script>

<template>
  <div class="falt">
    <header class="falt__head">
      <div>
        <h2 class="falt__title">{{ t('falt.title') }}</h2>
        <p class="falt__sub">{{ t('role.falt') }} · {{ t('valv.nord') }}</p>
      </div>
      <button class="crt-button crt-button--strong falt__submit" @click="store.openVerdict()">
        {{ t('falt.submit') }} ▸
      </button>
    </header>

    <div class="falt__body">
      <!-- Fingeravtrycksyta -->
      <section class="falt__surface-wrap">
        <div class="falt__surface-head">{{ t('falt.surface') }}</div>
        <div class="falt__surface amber-frame">
          <button
            v-for="s in store.spotStatuses"
            :key="s.id"
            class="falt__spot"
            :class="{ 'falt__spot--scanned': s.scanned }"
            :style="{ left: s.x + '%', top: s.y + '%' }"
            :title="t('falt.scan_a_print')"
            @click="store.scanSpot(s.id)"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
              <path d="M12 4a7 7 0 00-7 7v3M19 11a7 7 0 00-3-5.7M8 20c-.6-1.2-1-2.6-1-4v-3a5 5 0 019-3M16 12v2a9 9 0 001 4M12 11v4a6 6 0 00.8 3" />
            </svg>
          </button>
          <p class="falt__surface-hint">{{ t('falt.surface_hint') }}</p>
        </div>
        <ExposureMeter class="falt__meter" :value="store.uncertainty" :max="store.uncertaintyMax" />
      </section>

      <!-- Händelselogg -->
      <section class="falt__log amber-frame">
        <h3 class="falt__log-title">{{ t('falt.log_title') }}</h3>
        <p class="falt__log-head mono">{{ LOG.header }}</p>
        <ul class="falt__log-list">
          <li v-for="(e, i) in LOG.entries" :key="i" class="falt__log-row">
            <span class="falt__log-time mono">{{ e.time }}</span>
            <span class="falt__log-text">{{ e.text }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Person-popup (övervakningsbild) -->
    <div v-if="store.activeSpot" class="falt__popup" @click.self="store.closePopup()">
      <div class="falt__card amber-frame">
        <button class="falt__x" :aria-label="t('common.close')" @click="store.closePopup()">✕</button>
        <template v-if="person">
          <Placeholder class="falt__photo" :path="person.image" :label="person.name" />
          <div class="falt__id">
            <span class="falt__id-eyebrow">{{ t('falt.identified_as') }}</span>
            <span class="falt__id-name ink-strong">{{ person.name }}</span>
            <span class="falt__id-clothing">{{ person.clothing }}</span>
            <span class="falt__id-prints mono">{{ t('falt.prints_count', { n: prints }) }}</span>
          </div>
        </template>
        <div v-else class="falt__smudge">
          <h3 class="falt__smudge-title">{{ t('falt.smudge_title') }}</h3>
          <p>{{ t('falt.smudge_body') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.falt { display: flex; flex-direction: column; gap: 0.8rem; height: 100%; min-height: 0; position: relative; }
.falt__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.falt__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.falt__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.falt__submit { font-size: 1.2rem; }
.falt__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1rem; }
.falt__surface-wrap { display: flex; flex-direction: column; gap: 0.6rem; min-height: 0; }
.falt__surface-head { font-family: var(--font-retro); letter-spacing: 0.06em; color: var(--color-primary); }
.falt__surface {
  position: relative; flex: 1; min-height: 200px;
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    var(--color-background-2);
}
.falt__spot {
  position: absolute; transform: translate(-50%, -50%);
  background: transparent; border: none; cursor: pointer;
  color: var(--color-ink-muted); padding: 0.3rem; border-radius: 50%;
  transition: color 0.12s, transform 0.12s;
}
.falt__spot:hover { color: var(--color-primary); transform: translate(-50%, -50%) scale(1.15); }
.falt__spot--scanned { color: var(--color-primary-dim); opacity: 0.4; }
.falt__surface-hint {
  position: absolute; left: 0; right: 0; bottom: 0.5rem; margin: 0; text-align: center;
  font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-muted); pointer-events: none;
}
.falt__meter { flex: none; }
.falt__log { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.8rem; min-height: 0; overflow: hidden; }
.falt__log-title { margin: 0; font-size: 1rem; letter-spacing: 0.06em; color: var(--color-primary); }
.falt__log-head { font-size: 0.72rem; color: var(--color-ink-muted); }
.falt__log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; }
.falt__log-row { display: grid; grid-template-columns: 3.2em 1fr; gap: 0.6rem; }
.falt__log-time { color: var(--color-primary); }
.falt__log-text { font-family: var(--font-mono); font-size: 0.86rem; line-height: 1.35; }
.falt__popup {
  position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center;
  background: rgba(3, 9, 6, 0.82); padding: 1.5rem;
}
.falt__card { position: relative; display: flex; gap: 1rem; padding: 0.8rem; max-width: 46ch; background: var(--color-background-2); }
.falt__x {
  position: absolute; top: 0.3rem; right: 0.3rem; z-index: 2; background: transparent; border: none;
  color: var(--color-ink-strong); font-size: 1.1rem; cursor: pointer; padding: 0.2rem 0.4rem;
}
.falt__photo { width: 15rem; max-width: 42vw; }
.falt__id { display: flex; flex-direction: column; gap: 0.3rem; justify-content: center; }
.falt__id-eyebrow { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; color: var(--color-primary); }
.falt__id-name { font-size: 1.5rem; letter-spacing: 0.03em; }
.falt__id-clothing { font-family: var(--font-mono); font-size: 0.9rem; color: var(--color-ink-muted); }
.falt__id-prints { color: var(--color-primary); margin-top: 0.3rem; }
.falt__smudge { display: flex; flex-direction: column; gap: 0.4rem; justify-content: center; text-align: center; padding: 1rem 1.5rem; color: var(--color-danger); }
.falt__smudge-title { margin: 0; letter-spacing: 0.06em; }
</style>
