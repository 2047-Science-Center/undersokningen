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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { personById, PERSONS, THIEF_ID } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Placeholder from './Placeholder.vue'
import Icon from './Icon.vue'
import { useRotation } from '@/station-kit/rotation/rotation'
import { useLjus } from '@/station-kit/ljus'
import { AvslutRuta, useAvslut, spelaAvslutLjud, AVSLUT_LJUD } from '@/station-kit/resultat'
import { BADA } from '../ljus'

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

// Rotationen: verdiktet visat → "Vi är klara" (på fält-skärmen också) = done + lek.
const rotation = useRotation()
const inRotation = computed(() => rotation.state.phase === 'running')
function onAgain(): void {
  if (!rotation.finishSkarp()) store.reset()
}

/*
 * Avslutet (station-kit/resultat, XY-RESULTAT-OCH-VINST §2.3): båda skärmarna kör samma takter
 * när utfallet kommer. Uppbyggnad "NI PEKAR UT …" → spänning → stämpeln SKYLDIG/OSKYLDIG.
 * Fel → en andra, kortare spänning → "DEN RIKTIGA TJUVEN VAR …" + tjuven. Ljus + ljud: bara
 * ledaren (ljusets skrivare, en ljudkälla). Auto-vidare efter 45 s (ledaren) = done → lek.
 */
const ljus = useLjus()
const tjuvSynlig = ref(false)
let tjuvTimer: ReturnType<typeof setTimeout> | null = null
const rattPekad = computed(() => won.value)
const ingenPekad = computed(() => !picked.value)

const avslut = useAvslut({
  ljud: () => store.leader,
  ljus: { skrivare: () => store.leader, ids: BADA },
  onAvslojande: () => {
    if (!store.leader) return
    const u = won.value ? 'vinst' : 'forlust'
    ljus.utfall(u, BADA, { tyst: true })
    setTimeout(() => ljus.ljud(u), 650) // efter slaget, aldrig samtidigt
  },
  onTakt: (takt) => {
    if (takt === 'avslojande') tjuvSynlig.value = won.value || ingenPekad.value
    if (takt === 'utfall' && !won.value && !ingenPekad.value) {
      // Andra spänningen: vem var det då?
      if (store.leader) spelaAvslutLjud(AVSLUT_LJUD.virvelKort)
      tjuvTimer = setTimeout(() => {
        tjuvSynlig.value = true
        if (store.leader) spelaAvslutLjud(AVSLUT_LJUD.avslojande)
      }, 1300)
    }
  },
  onAuto: () => {
    if (store.leader) onAgain()
  },
})
const takt = avslut.takt
const kanGaVidare = avslut.kanGaVidare

watch(
  done,
  (d) => {
    if (tjuvTimer) clearTimeout(tjuvTimer)
    tjuvSynlig.value = false
    if (d) avslut.start()
    else avslut.aterstall()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (tjuvTimer) clearTimeout(tjuvTimer)
})

const uppText = computed(() =>
  pickedPerson.value ? t('verdict.upp_pick', { name: pickedPerson.value.name.toUpperCase() }) : t('verdict.upp_none'),
)
const rubrik = computed(() => (won.value ? t('verdict.win_title') : t('verdict.lost_title')))
const underrubrik = computed(() => {
  if (won.value && thief.value) return t('verdict.win_who', { name: thief.value.name })
  if (ingenPekad.value) return t('verdict.none_sub')
  return ''
})
const rad = computed(() => (won.value ? t('verdict.win_rad') : ingenPekad.value ? '' : t('verdict.lost_sub')))
const knapp = computed(() => (inRotation.value ? t('verdict.vidare') : store.leader ? t('verdict.again') : null))
</script>

<template>
  <div class="vd">
    <!-- Utfall: avslutets takter (station-kit/resultat) -->
    <AvslutRuta
      v-if="done"
      :takt="takt"
      :typ="won ? 'klarat' : 'missat'"
      :uppbyggnad="uppText"
      :spanning="t('verdict.spanning')"
      :rubrik="rubrik"
      :underrubrik="underrubrik"
      :rad="rad"
      :knapp="knapp"
      :vanta="t('common.waiting')"
      :kan-ga-vidare="kanGaVidare"
      @vidare="onAgain"
    >
      <template #fore>
        <div v-if="pickedPerson" class="vd__pekad amber-frame">
          <Placeholder class="vd__pekad-photo" :path="pickedPerson.image" :label="pickedPerson.name" />
        </div>
        <p v-else class="vd__sub">{{ t('verdict.upp_none_sub') }}</p>
      </template>
      <template #media>
        <div v-if="pickedPerson" class="vd__pekad amber-frame" :class="rattPekad ? 'vd__pekad--ratt' : 'vd__pekad--fel'">
          <Placeholder class="vd__pekad-photo" :path="pickedPerson.image" :label="pickedPerson.name" />
          <span class="vd__stampel">{{ rattPekad ? t('verdict.skyldig') : t('verdict.oskyldig') }}</span>
          <span class="vd__pekad-name ink-strong">{{ pickedPerson.name }}</span>
        </div>
      </template>
      <template #detalj>
        <div v-if="!rattPekad" class="vd__real">
          <p class="vd__real-eyebrow">{{ t('verdict.real_thief') }}</p>
          <div v-if="thief && tjuvSynlig" class="vd__thief amber-frame vd__thief--in">
            <Placeholder class="vd__thief-photo" :path="thief.image" :label="thief.name" />
            <div>
              <span class="vd__thief-eyebrow">{{ t('verdict.the_thief_was') }}</span>
              <span class="vd__thief-name ink-strong">{{ thief.name }}</span>
              <span class="vd__thief-clothing">{{ thief.clothing }} · {{ thief.hair }}</span>
            </div>
          </div>
        </div>
      </template>
    </AvslutRuta>

    <!-- Val -->
    <template v-if="!done">
      <h1 class="vd__title">{{ t('verdict.title') }}</h1>
      <p class="vd__sub">{{ ingenSkannad ? t('verdict.none_scanned') : t('verdict.hint') }}</p>
      <div class="vd__grid">
        <button
          v-for="(p, i) in galleri" :key="p.id"
          class="vd__card amber-frame" :class="{ 'vd__card--sel': picked === p.id }"
          :style="{ animationDelay: i * 55 + 'ms' }"
          @click="store.selectThief(p.id)"
        >
          <Placeholder class="vd__card-photo" :path="p.image" :label="p.name" />
          <span class="vd__card-name ink-strong">{{ p.name }}</span>
          <span class="vd__card-clothing">{{ p.clothing }}</span>
          <span v-if="!ingenSkannad" class="vd__card-prints mono"><Icon name="finger" :size="13" /> {{ t('falt.prints_count', { n: p.count }) }}</span>
        </button>
      </div>
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
.vd__card-name { font-family: var(--font-mono); font-weight: 600; font-size: 0.95rem; }
.vd__card-clothing { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); }
.vd__card-prints { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--color-primary); }
.vd__actions { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem; }
.vd__confirm { font-size: 1.3rem; }
.vd__back { font-size: 1.1rem; }
.vd__thief { display: flex; gap: 1rem; align-items: center; margin: 0.5rem 0; padding: 0.6rem; background: var(--color-background-2); }
.vd__thief-photo { width: 12rem; }
.vd__thief div { display: flex; flex-direction: column; gap: 0.2rem; text-align: left; }
.vd__thief-eyebrow { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; color: var(--color-primary); }
.vd__thief-name { font-size: 1.6rem; }
.vd__thief-clothing { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.vd__wait { font-family: var(--font-mono); color: var(--color-ink-muted); }
/* Avslutet: personen gruppen pekade ut + stämpeln, sedan (vid fel) den riktiga tjuven */
.vd__pekad { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.6rem; background: var(--color-background-2); }
.vd__pekad-photo { width: clamp(10rem, 20vw, 15rem); aspect-ratio: 4 / 3; }
.vd__pekad-name { font-family: var(--font-mono); font-weight: 600; }
.vd__stampel {
  position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%) rotate(-12deg);
  padding: 0.15rem 0.9rem; border: 4px solid currentColor; border-radius: 6px;
  font-family: var(--font-retro); font-size: clamp(2.2rem, 4.4vw, 3.6rem); letter-spacing: 0.08em;
  background: rgba(5, 16, 11, 0.55); animation: vd-stampel 0.32s cubic-bezier(0.23, 1, 0.32, 1) both;
}
.vd__pekad--ratt .vd__stampel { color: #4fd14f; }
.vd__pekad--fel .vd__stampel { color: var(--color-danger); }
@keyframes vd-stampel { from { opacity: 0; transform: translate(-50%, -50%) rotate(-12deg) scale(1.8); } }
.vd__real { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-height: 9rem; }
.vd__real-eyebrow { margin: 0; font-family: var(--font-retro); font-size: clamp(1.6rem, 3vw, 2.4rem); color: var(--color-primary); }
.vd__thief--in { animation: vd-rise 420ms var(--ease-out) both; opacity: 0; transform: translateY(8px); }
@media (prefers-reduced-motion: reduce) { .vd__card { animation: none; opacity: 1; transform: none; } }
</style>
