<script setup lang="ts">
/**
 * Verdikt (på FÄLT-skärmen): nu — och bara nu — gissar man. Markera en person
 * ur galleriet → BEKRÄFTA → ett enda utpekande. Rätt → FALLET LÖST, annars
 * SPÅRET KALLNADE. Ingen poäng under utredningen; detta är hela gissningen.
 *
 * Utfallet visas på BÅDA skärmarna (labbsidan visar bara utfallsdelen). Resultatrutans tider
 * (XY-FEEDBACK-LJUS-LJUD §6): "vidare" tidigast efter 8 s, auto-vidare efter 45 s = samma som
 * knappen (bara ledaren auto-avslutar, så done/reset inte skickas två gånger). Utfallets ljus +
 * ljud tänds i storen (ledaren, en gång).
 *
 * Får aldrig bli en återvändsgränd: galleriet är aldrig tomt (inget skannat → alla som var i
 * valvet), och medan tiden räcker kan man gå tillbaka till utredningen.
 */
import { computed, ref, watch } from 'vue'
import { personById, PERSONS, THIEF_ID } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Placeholder from './Placeholder.vue'
import Icon from './Icon.vue'
import PersonViewer from './PersonViewer.vue'
import { tiderFor } from '../logg/logg'
import { useRotation } from '@/station-kit/rotation/rotation'
import { useResultatTid } from '@/station-kit/ljus'

const store = useUndersokningenStore()
const { t } = useI18n()

const done = computed(() => store.phase === 'solved' || store.phase === 'failed')
const won = computed(() => store.outcome === 'win')
const thief = computed(() => personById(THIEF_ID))
const picked = computed(() => store.verdictPick)
const pickedPerson = computed(() => (picked.value ? personById(picked.value) : null))
/** Inget skannat (t.ex. "GISSA TJUVEN" direkt) → alla personer, annars blir det inget att välja. */
const ingenSkannad = computed(() => store.revealedPersons.length === 0)
const galleri = computed(() => (ingenSkannad.value ? PERSONS.map((p) => ({ ...p, count: 0 })) : store.revealedPersons))
/** Tillbaka till utredningen så länge tiden inte har gått ut. */
const kanGaTillbaka = computed(() => store.secondsLeft > 0)
/** Helskärm: bläddra mellan de misstänkta (med fältets loggkoppling) innan man väljer. */
const visas = ref<number | null>(null)
const visade = computed(() => galleri.value.map((p) => ({ ...p, tider: tiderFor(store.linksFor(p.id)) })))
function valj(id: string): void {
  store.selectThief(id)
  visas.value = null
}

// Rotationen: verdiktet visat → "Vi är klara" (på fält-skärmen också) = done + lek.
const rotation = useRotation()
const inRotation = computed(() => rotation.state.phase === 'running')
function onAgain(): void {
  if (!rotation.finishSkarp()) store.reset()
}

const rt = useResultatTid({ onAuto: () => store.leader && onAgain() })
const kanGaVidare = rt.kanGaVidare
watch(done, (d) => (d ? rt.start() : rt.stop()), { immediate: true })
</script>

<template>
  <div class="vd">
    <!-- Utfall -->
    <template v-if="done">
      <Icon :name="won ? 'check' : 'exponering'" :size="48" />
      <h1 class="vd__title" :class="won ? 'vd__title--win' : 'vd__title--lost'">
        {{ won ? t('verdict.win_title') : t('verdict.lost_title') }}
      </h1>
      <p class="vd__sub">{{ won ? t('verdict.win_sub') : t('verdict.lost_sub') }}</p>
      <div v-if="thief" class="vd__thief amber-frame">
        <Placeholder class="vd__thief-photo" :path="thief.image" :label="thief.name" />
        <div>
          <span class="vd__thief-eyebrow">{{ t('verdict.the_thief_was') }}</span>
          <span class="vd__thief-name ink-strong">{{ thief.name }}</span>
          <span class="vd__thief-clothing">{{ thief.clothing }} · {{ thief.hair }}</span>
        </div>
      </div>
      <button v-if="store.leader || inRotation" class="crt-button crt-button--strong" :disabled="!kanGaVidare" @click="onAgain">
        {{ inRotation ? 'Vi är klara ▸' : t('verdict.again') }}
      </button>
      <p v-else class="vd__wait">{{ t('common.waiting') }}</p>
    </template>

    <!-- Val -->
    <template v-else>
      <h1 class="vd__title">{{ t('verdict.title') }}</h1>
      <p v-if="!kanGaTillbaka" class="vd__timeup">{{ t('verdict.time_up') }}</p>
      <p class="vd__sub">{{ ingenSkannad ? t('verdict.none_scanned') : t('verdict.hint') }} {{ t('verdict.browse') }}.</p>
      <div class="vd__grid">
        <button
          v-for="(p, i) in galleri" :key="p.id"
          class="vd__card amber-frame" :class="{ 'vd__card--sel': picked === p.id }"
          :style="{ animationDelay: i * 55 + 'ms' }"
          @click="visas = i"
        >
          <Placeholder class="vd__card-photo" :path="p.image" :label="p.name" />
          <span class="vd__card-name ink-strong">{{ p.name }}</span>
          <span class="vd__card-clothing">{{ p.clothing }}</span>
          <span v-if="!ingenSkannad" class="vd__card-prints mono"><Icon name="finger" :size="13" /> {{ t('falt.prints_count', { n: p.count }) }}</span>
          <span v-if="visade[i]?.tider" class="vd__card-prints mono"><Icon name="logg" :size="13" /> {{ visade[i].tider }}</span>
        </button>
      </div>
      <PersonViewer :personer="visade" :index="visas" @update:index="visas = $event" @close="visas = null">
        <template #actions="{ person }">
          <button class="crt-button crt-button--strong vd__pick" @click="valj(person.id)">{{ t('verdict.pick_this', { name: person.name }) }}</button>
        </template>
      </PersonViewer>
      <div class="vd__actions">
        <button v-if="kanGaTillbaka" class="crt-button vd__back" @click="store.closeVerdict()">{{ t('verdict.back') }}</button>
        <button class="crt-button crt-button--strong vd__confirm" :disabled="!pickedPerson" @click="store.confirmThief()">
          {{ pickedPerson ? t('verdict.confirm', { name: pickedPerson.name }) : t('verdict.pick_first') }}
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
.vd__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.8rem; width: 100%; max-width: 760px; margin-top: 0.3rem; }
.vd__card {
  display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem; background: var(--color-background-2);
  cursor: pointer; color: inherit; text-align: left;
  transition: transform 0.14s var(--ease-out), border-color 0.14s var(--ease-out), box-shadow 0.14s var(--ease-out);
  opacity: 0; transform: translateY(8px); animation: vd-rise 300ms var(--ease-out) forwards;
}
.vd__card:hover { border-color: var(--color-ink-strong); }
.vd__card:active { transform: scale(0.98); }
.vd__card--sel { border-color: var(--color-ink-strong); box-shadow: 0 0 16px rgba(var(--mode-accent-rgb), 0.6); }
@keyframes vd-rise { to { opacity: 1; transform: translateY(0); } }
.vd__card-photo { aspect-ratio: 4 / 3; }
.vd__card-photo :deep(.ph__img) { object-fit: contain; background: #000; }
.vd__card-name { font-family: var(--font-mono); font-weight: 600; font-size: 0.95rem; }
.vd__card-clothing { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); }
.vd__card-prints { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--color-primary); }
.vd__actions { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem; }
.vd__confirm { font-size: 1.3rem; }
.vd__pick { font-size: clamp(1.2rem, 2.6vw, 1.7rem); padding: 0.7em 1.6em; }
.vd__timeup { margin: 0; font-family: var(--font-mono); font-size: clamp(1rem, 2vw, 1.3rem); color: var(--color-primary); }
.vd__back { font-size: 1.1rem; }
.vd__thief { display: flex; gap: 1rem; align-items: center; margin: 0.5rem 0; padding: 0.6rem; background: var(--color-background-2); }
.vd__thief-photo { width: 12rem; }
.vd__thief div { display: flex; flex-direction: column; gap: 0.2rem; text-align: left; }
.vd__thief-eyebrow { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; color: var(--color-primary); }
.vd__thief-name { font-size: 1.6rem; }
.vd__thief-clothing { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.vd__wait { font-family: var(--font-mono); color: var(--color-ink-muted); }
@media (prefers-reduced-motion: reduce) { .vd__card { animation: none; opacity: 1; transform: none; } }
</style>
