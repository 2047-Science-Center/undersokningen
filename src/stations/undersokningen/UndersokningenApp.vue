<script setup lang="ts">
/**
 * App-skal för Stölden. Attract → tutorial → skarpt fall. Två fönster på en NUC
 * (#lag1 = LABB, #lag2 = FÄLT), synk via BroadcastChannel. data-mode: blått under
 * tutorial, orange skarpt. Timer syns under fallet; verdikt pekas ut på fält-skärmen.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { config, ROLLVAL, ENTRE, SIDE_TO_VALV, MISSIONS, ROLE_ATTRACT, MUSIC, ROTATION, asset, type RoleId } from '@/config'
import { useStationMode } from '@/station-kit/mode/useStationMode'
import { audio } from '@/station-kit/audio/AudioEngine'
import CrtScreen from '@/station-kit/components/CrtScreen.vue'
import AttractScreen from '@/station-kit/components/AttractScreen.vue'
import Entre from '@/station-kit/entre/Entre.vue'
import { initEntre } from '@/station-kit/entre/entre'
import ModeCountdown from '@/station-kit/components/ModeCountdown.vue'
import MuteButton from '@/station-kit/components/MuteButton.vue'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from './store/undersokningenStore'
import LabbConsole from './components/LabbConsole.vue'
import FaltConsole from './components/FaltConsole.vue'
import VerdictScreen from './components/VerdictScreen.vue'
import PilotPanel from './components/PilotPanel.vue'
import FacilitatorControls from './components/FacilitatorControls.vue'
import Onboarding from './onboarding/Onboarding.vue'
import RotationScreens from '@/station-kit/rotation/RotationScreens.vue'
import { initRotation, rotationOptions } from '@/station-kit/rotation/rotation'

const store = useUndersokningenStore()
const { t } = useI18n()
const { setMode } = useStationMode()

const isPilot = config.mode === 'pilot'
const entered = ref(false)
const showGoLive = ref(false)

// --- Rotationen + entrén (station-kit): entréns attract visar "Testgrupp X — tryck"
//     + sidindelningen, sedan rollval-klipp → valet → ombalansering → "gå till sida A/B".
//     Sida A = lag1 = LABB, sida B = lag2 = FÄLT (config ENTRE). ---
const rotation = initRotation(rotationOptions(ROTATION))
const entre = initEntre({ stationN: ROTATION.stationN, config: ENTRE, mqttUrl: rotationOptions(ROTATION).mqttUrl })
const entreDone = computed(() => entre.state.step === 'klar')
watch(
  () => [store.view, store.leader] as const,
  ([v, leader]) => entre.setScreen({ side: v === 'lag1' ? 'A' : v === 'lag2' ? 'B' : null, leader }),
  { immediate: true },
)
/** Entrén klar → lottade roller in i spelet (ledaren dispatchar; synkas). */
function onEntreDone(): void {
  const team = (side: 'A' | 'B') =>
    entre.personer.value
      .filter((p) => p.side === side)
      .map((p) => ({
        band_id: p.band_id,
        name: p.name,
        team: SIDE_TO_VALV[side],
        // DB: chosen_role är NOT NULL — den som inte hann välja (facilitatorns "Lotta nu") loggas som sin tilldelade roll.
        chosen_role: p.chosen_role ?? p.assigned_role,
        assigned_role: p.assigned_role,
        role_presented_as: null,
      }))
  store.setRoster({ lag1: team('A'), lag2: team('B') })
}

/** Attract per roll: varje skärm (lag1=LABB, lag2=FÄLT) visar sin egen bild + uppdrag. */
const attractRole = computed<RoleId | null>(() =>
  store.view === 'lag1' ? 'labb' : store.view === 'lag2' ? 'falt' : null,
)
const attractImage = computed(() => (attractRole.value ? asset(ROLE_ATTRACT[attractRole.value].image) : undefined))
const attractRoleName = computed(() => (attractRole.value ? ROLE_ATTRACT[attractRole.value].role : undefined))
const attractMission = computed(() => (attractRole.value ? MISSIONS[attractRole.value].short : undefined))

const onboarded = computed(() => store.onbStage === 'live')
const isShared = computed(() => store.view === 'shared')
const onboardTeam = computed(() => (store.view === 'lag2' ? 'lag2' : 'lag1'))
/** Fält-innehåll: investigate → konsol, annars (verdict/solved/failed) → verdikt. */
const faltVerdict = computed(() => store.phase !== 'investigate' && store.phase !== 'intro')

const stationMode = computed<'tutorial' | 'live'>(() =>
  entered.value && !onboarded.value && entreDone.value ? 'tutorial' : 'live',
)
watch(
  stationMode,
  (m) => {
    setMode(m)
    // Musik-nivån (svag i tutorial, högre skarpt) rampas BARA av ledar-fönstret
    // (samma fönster som äger uppspelningen) — annars "följer" volymen båda
    // skärmarna osynkat. setMode (blått/orange) körs däremot per skärm.
    if (store.leader) audio.setMusicLevel(m === 'live' ? MUSIC.live : MUSIC.tutorial)
  },
  { immediate: true },
)

const mmss = computed(() => {
  const s = store.secondsLeft
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const showTimer = computed(() => onboarded.value && store.phase === 'investigate')

function enter(): void {
  entered.value = true
}
watch(entered, (v) => {
  store.setSessionActive(v)
  // Bakgrundsmusik: EN källa. Bara ledar-fönstret (lag1/shared) startar/stoppar
  // loopen, så den inte dubbelspelas osynkat från båda skärmarna. Attract-
  // klicket (begin) har låst upp ljudkontexten i varje fönster (för lokala SFX).
  if (!store.leader) return
  if (v) audio.startMusic(asset(MUSIC.track), MUSIC.attract)
  else audio.stopMusic()
})

watch(onboarded, (v) => {
  if (v && store.phase !== 'investigate') showGoLive.value = true
  if (v) rotation.markSkarp()
})

// --- Rotationen: entréns touch = begin(); verdikt-skärmens "klara"-knapp = done + lek
//     (VerdictScreen); lämnar gruppen 'running' (lek / ny grupp) → stationen återställs. ---
watch(
  () => rotation.state.phase,
  (p, old) => {
    if (p === 'running') {
      audio.unlock()
      enter()
    } else if (old === 'running') store.reset()
  },
)
function goLiveDone(): void {
  showGoLive.value = false
  if (store.leader && store.phase !== 'investigate') store.startLive()
}

watch(
  () => store.resetSignal,
  () => {
    entered.value = false
    showGoLive.value = false
    entre.reset()
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
  entre.attachTransport(store.transport())
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
    <!-- Entrén: attract (testgrupp + sidindelning) → rollval → valet → utfall -->
    <CrtScreen v-if="!entreDone">
      <Entre :rollval="ROLLVAL" @start="enter" @done="onEntreDone">
        <template #attract="{ start }">
          <AttractScreen
            :mission="attractMission"
            :image="attractImage"
            :role="attractRoleName"
            @start="start"
          />
        </template>
      </Entre>
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
    <FacilitatorControls v-if="entered" />
    <PilotPanel v-if="isPilot && entered" />
    <ModeCountdown v-if="showGoLive" :title="t('mode.golive_title')" :from="3" @done="goLiveDone" />

    <div v-if="store.paused" class="app__pause">
      <p class="app__pause-title">{{ t('facil.paused_title') }}</p>
      <p class="app__pause-sub">{{ t('facil.paused_sub') }}</p>
    </div>

    <!-- Rotationen: väntar / lek (overlay; "Testgrupp X — tryck" visas av entrén) -->
    <RotationScreens station-title="Undersökningen" />
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
