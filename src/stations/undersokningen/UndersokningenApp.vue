<script setup lang="ts">
/**
 * App-skal för Stölden. Attract → tutorial → skarpt fall. Två fönster på en NUC
 * (#lag1 = LABB, #lag2 = FÄLT), synk via BroadcastChannel. data-mode: blått under
 * tutorial, orange skarpt. Timer syns under fallet; verdikt pekas ut på fält-skärmen.
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
/** Fält-innehåll: investigate → konsol, annars (verdict/solved/failed) → verdikt. */
const faltVerdict = computed(() => store.phase !== 'investigate' && store.phase !== 'intro')

const stationMode = computed<'tutorial' | 'live'>(() => (entered.value && !onboarded.value ? 'tutorial' : 'live'))
watch(stationMode, (m) => setMode(m), { immediate: true })

const mmss = computed(() => {
  const s = store.secondsLeft
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const showTimer = computed(() => onboarded.value && store.phase === 'investigate')

function enter(): void {
  entered.value = true
}
watch(entered, (v) => store.setSessionActive(v))

watch(onboarded, (v) => {
  if (v && store.phase !== 'investigate') showGoLive.value = true
})
function goLiveDone(): void {
  showGoLive.value = false
  if (store.leader && store.phase !== 'investigate') store.startLive()
}

watch(
  () => store.resetSignal,
  () => {
    entered.value = false
    showGoLive.value = false
  },
)

const ACTIVITY = ['pointerdown', 'keydown', 'touchstart'] as const
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
    <CrtScreen v-else-if="!onboarded">
      <Onboarding :team="onboardTeam" :shared="isShared" />
    </CrtScreen>

    <!-- Skarpt -->
    <div v-else class="app__live">
      <div v-if="showTimer" class="app__timer" :class="{ 'app__timer--warn': store.timerWarn }">
        {{ t('timer.label') }} <span class="app__timer-num mono">{{ mmss }}</span>
      </div>

      <div v-if="isShared" class="app__split">
        <CrtScreen><LabbConsole /></CrtScreen>
        <CrtScreen>
          <VerdictScreen v-if="faltVerdict" />
          <FaltConsole v-else />
        </CrtScreen>
      </div>
      <CrtScreen v-else-if="store.view === 'lag1'"><LabbConsole /></CrtScreen>
      <CrtScreen v-else>
        <VerdictScreen v-if="faltVerdict" />
        <FaltConsole v-else />
      </CrtScreen>
    </div>

    <!-- Overlays -->
    <MuteButton class="app__mute" />
    <PilotPanel v-if="isPilot && entered" />
    <ModeCountdown v-if="showGoLive" :title="t('mode.golive_title')" :from="3" @done="goLiveDone" />

    <div v-if="store.paused" class="app__pause">
      <p class="app__pause-title">{{ t('facil.paused_title') }}</p>
      <p class="app__pause-sub">{{ t('facil.paused_sub') }}</p>
    </div>
  </div>
</template>

<style scoped>
.app { height: 100vh; padding: clamp(0.5rem, 2vh, 1.2rem); background: var(--color-background); }
.app__live { height: 100%; display: flex; flex-direction: column; gap: 0.6rem; }
.app__timer {
  align-self: center; display: flex; align-items: center; gap: 0.6rem;
  font-family: var(--font-retro); letter-spacing: 0.08em; color: var(--color-primary);
  border: 1px solid var(--color-primary-dim); border-radius: 999px; padding: 0.2rem 1.1rem; background: var(--color-background-2);
}
.app__timer-num { font-size: 1.6rem; color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.app__timer--warn { border-color: var(--color-danger); color: var(--color-danger); animation: tpulse 0.8s ease-in-out infinite; }
.app__timer--warn .app__timer-num { color: var(--color-danger); }
@keyframes tpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.app__split { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.app__split > * { min-height: 0; }
.app__live > :not(.app__timer) { flex: 1; min-height: 0; }
.app__mute { position: fixed; left: 0.8rem; bottom: 0.8rem; z-index: 300; }
.app__pause { position: fixed; inset: 0; z-index: 350; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; background: rgba(3, 9, 6, 0.9); text-align: center; }
.app__pause-title { font-size: 2.4rem; letter-spacing: 0.12em; color: var(--color-primary); text-shadow: var(--glow-strong); margin: 0; }
.app__pause-sub { font-family: var(--font-mono); color: var(--color-ink-muted); margin: 0; }
@media (prefers-reduced-motion: reduce) { .app__timer--warn { animation: none; } }
</style>
