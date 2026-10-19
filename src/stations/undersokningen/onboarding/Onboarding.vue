<script setup lang="ts">
/**
 * Tutorial — "lär genom att göra" (speglar Förhandlingen + Minnestest-
 * utvärderingen §2). Tutorialen ÄR det riktiga UI:t: coach-marks dimmar allt
 * utom aktuellt element, en sync-barriär gatar mellan faserna, EN övningsrunda
 * (blått) körs på riktiga konsolen, sedan reveal → go-live (orange).
 *
 * Faser (synkade via storet): opening → test → testresult → live.
 * Inom opening: legend → coach-marks → gate (barriär).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { VALV, PRACTICE_DATASET, type ValvId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import ModeLegend from '@/station-kit/components/ModeLegend.vue'
import CoachMark from '@/station-kit/components/CoachMark.vue'
import { OTHER, allSolved } from '../engine/gameEngine'
import { useUndersokningenStore } from '../store/undersokningenStore'
import FaltConsole from '../components/FaltConsole.vue'
import LabbConsole from '../components/LabbConsole.vue'
import BarrierWait from './BarrierWait.vue'

const props = defineProps<{ team: ValvId; shared?: boolean }>()
const store = useUndersokningenStore()
const { t } = useI18n()

const me = computed(() => props.team)
const other = computed(() => OTHER[props.team])
const leader = computed(() => props.shared || me.value === 'lag1')
const role = computed(() => VALV[me.value].role)
const stage = computed(() => store.onbStage)

const openingPhase = ref<'legend' | 'coach' | 'gate'>('legend')
const coachStep = ref(0)
const iAmReady = ref(false)

interface Spec { target: string | null; title: string; body: string }
const coachSpecs = computed<Spec[]>(() => {
  if (role.value === 'falt') {
    return [
      { target: '[data-tut="scan"]', title: t('coach.falt.scan_title'), body: t('coach.falt.scan_body') },
      { target: '[data-tut="signalement"]', title: t('coach.falt.features_title'), body: t('coach.falt.features_body') },
      { target: '[data-tut="report"]', title: t('coach.falt.report_title'), body: t('coach.falt.report_body') },
    ]
  }
  return [
    { target: '[data-tut="bank"]', title: t('coach.lab.bank_title'), body: t('coach.lab.bank_body') },
    { target: '[data-tut="filter"]', title: t('coach.lab.filter_title'), body: t('coach.lab.filter_body') },
    { target: '[data-tut="lock"]', title: t('coach.lab.lock_title'), body: t('coach.lab.lock_body') },
  ]
})
const currentSpec = computed(() => coachSpecs.value[coachStep.value])

const bothReady = computed(
  () => store.onbReady[me.value] && (props.shared || store.onbReady[other.value]),
)

/* --- Övningsrunda laddas vid opening så coach-marks har riktiga mål --- */
function ensurePractice(): void {
  if (!leader.value) return
  if (store.dataset.id !== PRACTICE_DATASET.id || store.phase !== 'investigate') {
    store.startPractice()
    // Scanna fram övningsprovet så signalementet syns att coacha över.
    store.scanCase(PRACTICE_DATASET.cases[0].id)
  }
}

onMounted(() => {
  if (stage.value === 'opening') ensurePractice()
  // Shared hoppar över per-roll-coach-marks (de pekar på en konsol).
  if (props.shared) openingPhase.value = 'gate'
})

function coachNext(): void {
  audio.play('blip')
  if (coachStep.value < coachSpecs.value.length - 1) coachStep.value += 1
  else openingPhase.value = 'gate'
}

function markReady(): void {
  iAmReady.value = true
  store.onbMarkReady(me.value)
}

/* --- Leader-gatade fasbyten (sync-barriär) --- */
watch([bothReady, stage], () => {
  if (!leader.value) return
  if (bothReady.value && stage.value === 'opening') {
    store.clearActive() // så fältet får scanna själv i övningen
    store.onbGoto('test')
  }
  if (bothReady.value && stage.value === 'testresult') {
    store.onbGoto('live')
  }
})

// Övningen klar (löst eller exponering full) → reveal.
watch(
  () => [stage.value, store.solvedCount, store.phase] as const,
  () => {
    if (leader.value && stage.value === 'test' && (allSolved(store.state) || store.phase === 'verdict')) {
      store.onbGoto('testresult')
    }
  },
)

// Nollställ lokal barriär-flagga när stage byts.
watch(stage, () => {
  iAmReady.value = false
  coachStep.value = 0
  if (stage.value === 'opening' && !props.shared) openingPhase.value = 'legend'
})
</script>

<template>
  <div class="onb">
    <!-- Grund-UI: riktiga konsolen bakom (coach-marks dimmar över den) -->
    <div class="onb__stage">
      <template v-if="shared">
        <div class="onb__split">
          <LabbConsole />
          <FaltConsole />
        </div>
      </template>
      <template v-else>
        <LabbConsole v-if="role === 'labb'" />
        <FaltConsole v-else />
      </template>
    </div>

    <!-- OPENING: legend → coach → gate -->
    <template v-if="stage === 'opening'">
      <div v-if="openingPhase === 'legend'" class="onb__overlay">
        <div class="onb__card">
          <ModeLegend />
          <button class="crt-button crt-button--strong" @click="openingPhase = shared ? 'gate' : 'coach'">
            {{ t('onboarding.next') }} ▸
          </button>
        </div>
      </div>

      <CoachMark
        v-else-if="openingPhase === 'coach' && currentSpec"
        :target="currentSpec.target"
        :title="currentSpec.title"
        :body="currentSpec.body"
        :step="coachStep"
        :steps="coachSpecs.length"
        @next="coachNext"
      />

      <div v-else-if="openingPhase === 'gate'" class="onb__overlay">
        <div class="onb__card">
          <template v-if="!iAmReady">
            <p class="onb__gate-title">{{ t('test.intro_title') }}</p>
            <p class="onb__gate-sub">{{ t('test.intro_sub') }}</p>
            <button class="crt-button crt-button--strong" @click="markReady">{{ t('onb.ready') }}</button>
          </template>
          <BarrierWait v-else />
        </div>
      </div>
    </template>

    <!-- TEST: spela övningen på riktiga konsolen (banner) -->
    <div v-else-if="stage === 'test'" class="onb__band">
      {{ t('mode.testomgang') }} — {{ t('mode.practice_sub') }}
    </div>

    <!-- TESTRESULT: enkel reveal -->
    <div v-else-if="stage === 'testresult'" class="onb__overlay">
      <div class="onb__card onb__reveal">
        <h2 class="onb__reveal-title">{{ store.outcome === 'win' ? t('verdict.win_title') : t('mode.testomgang') }}</h2>
        <p class="onb__reveal-sub">
          {{ t('verdict.solved', { solved: store.solvedCount, total: store.totalCount }) }} ·
          {{ t('verdict.exposure', { n: store.exposure }) }}
        </p>
        <p class="onb__reveal-copy">{{ t('exposure.sub') }}</p>
        <template v-if="!iAmReady">
          <button class="crt-button crt-button--strong" @click="markReady">{{ t('onboarding.go_live') }} ▸</button>
        </template>
        <BarrierWait v-else />
      </div>
    </div>
  </div>
</template>

<style scoped>
.onb {
  position: relative;
  height: 100%;
}
.onb__stage {
  height: 100%;
}
.onb__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  height: 100%;
}
.onb__overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  padding: 2rem;
}
.onb__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
  text-align: center;
  max-width: 48ch;
}
.onb__gate-title,
.onb__reveal-title {
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: 0.06em;
  color: var(--color-primary);
}
.onb__gate-sub,
.onb__reveal-sub {
  margin: 0;
  font-family: var(--font-mono);
  color: var(--color-ink-strong);
}
.onb__reveal-copy {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--color-ink-muted);
}
.onb__band {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-background-2);
  border: 1px solid var(--color-primary);
  border-top: none;
  border-radius: 0 0 10px 10px;
  padding: 0.4rem 1.2rem;
  font-family: var(--font-retro);
  letter-spacing: 0.06em;
  color: var(--color-primary);
  z-index: 30;
}
</style>
