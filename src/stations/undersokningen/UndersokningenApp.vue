<script setup lang="ts">
/**
 * App-skalet för Undersökningen (Lager B). Väver attract → tutorial → skarpt,
 * en eller två konsoler beroende på vy (#lag1/#lag2/#shared), och sätter
 * data-mode-wrappern (blått under tutorial, orange skarpt) via useStationMode.
 * Speglar ForhandlingenApp.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { config } from '@/config'
import { useStationMode } from '@/station-kit/mode/useStationMode'
import CrtScreen from '@/station-kit/components/CrtScreen.vue'
import AttractScreen from '@/station-kit/components/AttractScreen.vue'
import ModeCountdown from '@/station-kit/components/ModeCountdown.vue'
import MuteButton from '@/station-kit/components/MuteButton.vue'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from './store/undersokningenStore'
import LabbConsole from './components/LabbConsole.vue'
import FaltConsole from './components/FaltConsole.vue'
import VerdictScreen from './components/VerdictScreen.vue'
import PilotPanel from './components/PilotPanel.vue'
import Onboarding from './onboarding/Onboarding.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const { setMode } = useStationMode()

const isPilot = config.mode === 'pilot'
const entered = ref(false)
const showGoLive = ref(false)

const onboarded = computed(() => store.onbStage === 'live')
const isShared = computed(() => store.view === 'shared')
const onboardTeam = computed(() => (store.view === 'lag2' ? 'lag2' : 'lag1'))
const liveVerdict = computed(() => onboarded.value && store.phase === 'verdict')

const stationMode = computed<'tutorial' | 'live'>(() =>
  entered.value && !onboarded.value ? 'tutorial' : 'live',
)
watch(stationMode, (m) => setMode(m), { immediate: true })

function enter(): void {
  entered.value = true
}
watch(entered, (v) => store.setSessionActive(v))

// Go-live: när tutorialen är klar, kör nedräkning → leader startar skarp runda.
watch(onboarded, (v) => {
  if (v && store.dataset.id !== 'live') showGoLive.value = true
})
function goLiveDone(): void {
  showGoLive.value = false
  if (store.leader && store.dataset.id !== 'live') store.startLive()
}

// Reset (manuell/idle/peer) → tillbaka till attract.
watch(
  () => store.resetSignal,
  () => {
    entered.value = false
    showGoLive.value = false
  },
)

const ACTIVITY = ['pointerdown', 'mousedown', 'click', 'keydown', 'touchstart', 'wheel'] as const
function onActivity(): void {
  store.notifyActivity()
}
function onContextMenu(e: Event): void {
  e.preventDefault()
}

onMounted(() => {
  store.init()
  window.addEventListener('contextmenu', onContextMenu)
  for (const ev of ACTIVITY) window.addEventListener(ev, onActivity, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  for (const ev of ACTIVITY) window.removeEventListener(ev, onActivity)
  store.dispose()
})
</script>

<template>
  <div class="app" :data-mode="stationMode">
    <!-- Attract -->
    <CrtScreen v-if="!entered">
      <AttractScreen @start="enter" />
    </CrtScreen>

    <!-- Tutorial -->
    <template v-else-if="!onboarded">
      <CrtScreen>
        <Onboarding :team="onboardTeam" :shared="isShared" />
      </CrtScreen>
    </template>

    <!-- Skarpt: utlåtande -->
    <CrtScreen v-else-if="liveVerdict">
      <VerdictScreen />
    </CrtScreen>

    <!-- Skarpt: konsoler -->
    <div v-else-if="isShared" class="app__split">
      <CrtScreen><LabbConsole /></CrtScreen>
      <CrtScreen><FaltConsole /></CrtScreen>
    </div>
    <CrtScreen v-else>
      <LabbConsole v-if="store.view === 'lag1'" />
      <FaltConsole v-else />
    </CrtScreen>

    <!-- Overlays -->
    <MuteButton class="app__mute" />
    <PilotPanel v-if="isPilot && entered" />
    <ModeCountdown v-if="showGoLive" :title="t('mode.golive_title')" :from="3" @done="goLiveDone" />

    <div v-if="store.paused" class="app__pause">
      <p class="app__pause-title">{{ t('facil.paused_title') }}</p>
      <p class="app__pause-sub">{{ t('facil.paused_sub') }}</p>
    </div>

    <div v-if="store.idleWarn" class="app__idle">
      {{ t('idle.restart_in') }} · {{ t('idle.seconds', { n: store.idleSecondsLeft }) }}
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  padding: clamp(0.5rem, 2vh, 1.2rem);
  background: var(--color-background);
}
.app__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: 100%;
}
.app__mute {
  position: fixed;
  left: 0.8rem;
  bottom: 0.8rem;
  z-index: 300;
}
.app__pause {
  position: fixed;
  inset: 0;
  z-index: 350;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: rgba(3, 9, 6, 0.9);
  text-align: center;
}
.app__pause-title {
  font-size: 2.4rem;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  text-shadow: var(--glow-strong);
  margin: 0;
}
.app__pause-sub {
  font-family: var(--font-mono);
  color: var(--color-ink-muted);
  margin: 0;
}
.app__idle {
  position: fixed;
  top: 0.8rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 320;
  background: var(--color-background-2);
  border: 1px solid var(--color-danger);
  border-radius: 10px;
  padding: 0.4rem 1rem;
  font-family: var(--font-mono);
  color: var(--color-danger);
}
</style>
