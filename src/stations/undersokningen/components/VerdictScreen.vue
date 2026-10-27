<script setup lang="ts">
/**
 * Verdikt (på FÄLT-skärmen): galleri med de personer man scannat fram → klicka
 * tjuven. Rätt → FALLET LÖST. Fel → osäkerhet stiger, titta igen. Utfall + nollställ.
 */
import { computed } from 'vue'
import { personById, THIEF_ID } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Placeholder from './Placeholder.vue'

const store = useUndersokningenStore()
const { t } = useI18n()

const done = computed(() => store.phase === 'solved' || store.phase === 'failed')
const won = computed(() => store.outcome === 'win')
const thief = computed(() => personById(THIEF_ID))
const wrongId = computed(() => store.state.lastWrongId)
</script>

<template>
  <div class="vd">
    <!-- Utfall -->
    <template v-if="done">
      <h1 class="vd__title" :class="won ? 'vd__title--win' : 'vd__title--lost'">
        {{ won ? t('verdict.win_title') : t('verdict.lost_title') }}
      </h1>
      <p class="vd__sub">{{ won ? t('verdict.win_sub') : t('verdict.lost_sub') }}</p>
      <div v-if="thief" class="vd__thief">
        <Placeholder class="vd__thief-photo" :path="thief.image" :label="thief.name" />
        <div>
          <span class="vd__thief-eyebrow">{{ t('verdict.the_thief_was') }}</span>
          <span class="vd__thief-name ink-strong">{{ thief.name }}</span>
          <span class="vd__thief-clothing">{{ thief.clothing }} · {{ thief.hair }}</span>
        </div>
      </div>
      <button v-if="store.leader" class="crt-button crt-button--strong" @click="store.reset()">
        {{ t('verdict.again') }}
      </button>
      <p v-else class="vd__wait">{{ t('common.waiting') }}</p>
    </template>

    <!-- Val -->
    <template v-else>
      <h1 class="vd__title">{{ t('verdict.title') }}</h1>
      <p class="vd__sub">{{ t('verdict.hint') }}</p>
      <p v-if="wrongId" class="vd__wrong">{{ t('verdict.wrong') }}</p>
      <div class="vd__grid">
        <button
          v-for="p in store.revealedPersons"
          :key="p.id"
          class="vd__card amber-frame"
          :class="{ 'vd__card--wrong': wrongId === p.id }"
          @click="store.pickThief(p.id)"
        >
          <Placeholder class="vd__card-photo" :path="p.image" :label="p.name" />
          <span class="vd__card-name ink-strong">{{ p.name }}</span>
          <span class="vd__card-clothing">{{ p.clothing }}</span>
          <span class="vd__card-prints mono">{{ t('falt.prints_count', { n: p.count }) }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vd { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; height: 100%; text-align: center; padding: 1.5rem; }
.vd__title { margin: 0; font-size: clamp(2rem, 6vw, 3.4rem); letter-spacing: 0.06em; }
.vd__title--win { color: var(--color-primary); text-shadow: var(--glow-strong); }
.vd__title--lost { color: var(--color-danger); }
.vd__sub { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); }
.vd__wrong { margin: 0; font-family: var(--font-retro); color: var(--color-danger); letter-spacing: 0.04em; }
.vd__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.8rem; width: 100%; max-width: 760px; margin-top: 0.5rem; }
.vd__card { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem; background: var(--color-background-2); cursor: pointer; color: inherit; text-align: left; }
.vd__card:hover { border-color: var(--color-ink-strong); box-shadow: 0 0 14px rgba(var(--mode-accent-rgb), 0.45); }
.vd__card--wrong { border-color: var(--color-danger); opacity: 0.5; }
.vd__card-photo { aspect-ratio: 4 / 3; }
.vd__card-name { font-family: var(--font-mono); font-weight: 600; font-size: 0.95rem; }
.vd__card-clothing { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); }
.vd__card-prints { font-size: 0.78rem; color: var(--color-primary); }
.vd__thief { display: flex; gap: 1rem; align-items: center; margin: 0.5rem 0; }
.vd__thief-photo { width: 12rem; }
.vd__thief div { display: flex; flex-direction: column; gap: 0.2rem; text-align: left; }
.vd__thief-eyebrow { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; color: var(--color-primary); }
.vd__thief-name { font-size: 1.6rem; }
.vd__thief-clothing { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.vd__wait { font-family: var(--font-mono); color: var(--color-ink-muted); }
</style>
