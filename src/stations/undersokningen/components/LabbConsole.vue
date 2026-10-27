<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Near-fullscreen Dino-Lite + hårklasser som tre rutor
 * (ikon + kort text) att sålla människa/djur/syntet mot. Man UNDERSÖKER bara —
 * gissningen sker på fält-skärmen i slutet (då visas "svara på andra skärmen").
 */
import { computed } from 'vue'
import { HAIR_CLASSES } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Microscope from './Microscope.vue'
import Icon from './Icon.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const verdicting = computed(() => store.phase === 'verdict')
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <Icon name="mikroskop" :size="26" />
      <div>
        <h2 class="lab__title">{{ t('lab.title') }}</h2>
        <p class="lab__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
      </div>
    </header>

    <p class="lab__hint">{{ t('lab.hint') }}</p>

    <Microscope class="lab__scope" />

    <section class="lab__classes">
      <div v-for="(c, i) in HAIR_CLASSES" :key="i" class="lab__class amber-frame" :style="{ animationDelay: i * 60 + 'ms' }">
        <Icon :name="c.icon" :size="30" />
        <span class="lab__class-label ink-strong">{{ c.label }}</span>
        <span class="lab__class-text">{{ c.text }}</span>
      </div>
    </section>

    <!-- Vid verdikt: peka användaren till fält-skärmen -->
    <div v-if="verdicting" class="lab__verdict">
      <Icon name="person" :size="48" />
      <p class="lab__verdict-big">{{ t('lab.answer_other') }}</p>
      <p class="lab__verdict-sub">{{ t('lab.verdict_running') }}</p>
    </div>
  </div>
</template>

<style scoped>
.lab { display: flex; flex-direction: column; gap: 0.7rem; height: 100%; min-height: 0; position: relative; }
.lab__head { display: flex; align-items: center; gap: 0.7rem; }
.lab__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.lab__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__hint { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__scope { flex: 1 1 auto; min-height: 220px; }
.lab__classes { flex: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.lab__class {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center;
  padding: 0.7rem 0.5rem; background: var(--color-background-2);
  opacity: 0; transform: translateY(8px); animation: lab-rise 300ms var(--ease-out) forwards;
}
.lab__class-label { font-family: var(--font-retro); letter-spacing: 0.04em; }
.lab__class-text { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-muted); }
@keyframes lab-rise { to { opacity: 1; transform: translateY(0); } }
.lab__verdict {
  position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem; text-align: center;
  background: rgba(3, 9, 6, 0.9); padding: 2rem; color: var(--color-primary);
}
.lab__verdict-big { margin: 0; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: 0.05em; text-shadow: var(--glow-strong); }
.lab__verdict-sub { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); max-width: 32ch; }
@media (prefers-reduced-motion: reduce) { .lab__class { animation: none; opacity: 1; transform: none; } }
</style>
