<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Near-fullscreen Dino-Lite + hårklass-remsa. De fysiska
 * hårproven (Q1–Q6) ligger på bordet; här tittar man på dem och sållar
 * människa/djur/syntet med remsan, och jämför med vems hår det liknar.
 * Vid verdikt pekar fält-skärmen ut tjuven → här visas "svara på andra skärmen".
 */
import { computed } from 'vue'
import { HAIR_CLASSES } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Microscope from './Microscope.vue'
import ExposureMeter from './ExposureMeter.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const verdicting = computed(() => store.phase === 'verdict')
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <div>
        <h2 class="lab__title">{{ t('lab.title') }}</h2>
        <p class="lab__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
      </div>
      <ExposureMeter class="lab__meter" :value="store.uncertainty" :max="store.uncertaintyMax" />
    </header>

    <p class="lab__hint">{{ t('lab.hint') }}</p>

    <Microscope class="lab__scope" />

    <section class="lab__classes amber-frame">
      <h3 class="lab__classes-title">{{ t('lab.hairclass_title') }}</h3>
      <ul class="lab__classes-list">
        <li v-for="(c, i) in HAIR_CLASSES" :key="i">
          <span class="lab__class-label ink-strong">{{ c.label }}:</span>
          <span class="lab__class-text">{{ c.text }}</span>
        </li>
      </ul>
    </section>

    <!-- Vid verdikt: peka användaren till fält-skärmen -->
    <div v-if="verdicting" class="lab__verdict">
      <p class="lab__verdict-big">{{ t('lab.answer_other') }}</p>
      <p class="lab__verdict-sub">{{ t('lab.verdict_running') }}</p>
    </div>
  </div>
</template>

<style scoped>
.lab { display: flex; flex-direction: column; gap: 0.7rem; height: 100%; min-height: 0; position: relative; }
.lab__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.lab__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.lab__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__meter { min-width: 220px; }
.lab__hint { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__scope { flex: 1 1 auto; min-height: 220px; }
.lab__classes { padding: 0.7rem 0.9rem; flex: none; }
.lab__classes-title { margin: 0 0 0.4rem; font-size: 0.95rem; letter-spacing: 0.06em; color: var(--color-primary); }
.lab__classes-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.lab__class-label { font-family: var(--font-mono); font-size: 0.85rem; }
.lab__class-text { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__verdict {
  position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem; text-align: center;
  background: rgba(3, 9, 6, 0.9); padding: 2rem;
}
.lab__verdict-big { margin: 0; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: 0.05em; color: var(--color-primary); text-shadow: var(--glow-strong); }
.lab__verdict-sub { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); max-width: 32ch; }
</style>
