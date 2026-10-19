/**
 * Pinia-store för Undersökningen — tunt orkestreringslager (ingen spellogik).
 * Binder motorn ↔ sömmen ↔ transport, exakt mönster som Förhandlingen:
 *   UI → dispatch(action) → reduce(state,action) → applyEffects() → broadcast()
 * Mottagen snapshot → reduce(state,{type:'sync'}) (ingen broadcast → ingen eko).
 *
 * Två valv synkas via transport (BroadcastChannel i pilot). "Vilket valv är
 * jag" avgörs lokalt av URL-hashen (#lag1/#lag2/#shared), aldrig av meddelandet.
 */

import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'

import { audio } from '@/station-kit/audio/AudioEngine'
import type { TransportMessage } from '@/station-kit/adapters/transport/Transport'
import type { ResultPayload } from '@/station-kit/adapters/result/ResultSink'

import {
  config,
  datasetById,
  virusById,
  VALV,
  PRACTICE_DATASET,
  LIVE_DATASET_ID,
  IDLE_RESTART,
  type ValvId,
  type SampleCase,
  type Virus,
} from '@/config'

import {
  initialState,
  reduce,
  stateSignal,
  caseById,
  type Action,
} from '../engine/gameEngine'
import type { GameState, Person } from '../engine/types'
import { personResults, roundScore } from '../engine/scoring'
import { createSeam, type Seam } from '../seam/createSeam'
import type { ScanEvent } from '../seam/Scan'

export type ViewSide = ValvId | 'shared'
/** Onboarding-faser (synkade över transport). 'live' = tutorial klar. */
export type OnbStage = 'opening' | 'test' | 'testresult' | 'live'

const IDLE_MS = IDLE_RESTART.minutes * 60_000

function viewFromHash(): ViewSide {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '')
  return h === 'lag1' || h === 'lag2' || h === 'shared' ? (h as ViewSide) : 'shared'
}

/** Deterministisk pilot-roster (delas av alla fönster). */
function defaultRoster(): Record<ValvId, Person[]> {
  return {
    lag1: [{ band_id: 'syd-a', name: 'Alva', team: 'lag1', chosen_role: 'A', assigned_role: 'A', role_presented_as: null }],
    lag2: [{ band_id: 'nord-b', name: 'Noah', team: 'lag2', chosen_role: 'B', assigned_role: 'B', role_presented_as: null }],
  }
}

export const useUndersokningenStore = defineStore('undersokningen', () => {
  const state = ref<GameState>(initialState(defaultRoster()))
  const seam = shallowRef<Seam | null>(null)

  const view = ref<ViewSide>(viewFromHash())
  const leader = computed(() => view.value === 'shared' || view.value === 'lag1')

  // --- Onboarding-koordinator (synkad över transport) ---
  const onbStage = ref<OnbStage>('opening')
  const onbEpoch = ref<number | null>(null)
  const onbReady = ref<Record<ValvId, boolean>>({ lag1: false, lag2: false })

  // --- Drift/idle/paus ---
  const paused = ref(false)
  const sessionActive = ref(false)
  const now = ref(Date.now())
  const lastActivityAt = ref(Date.now())
  const resetSignal = ref(0)

  // Effekt-jämförelse (modullokalt via refs i closure).
  let prevPhase: GameState['phase'] | null = null
  let prevExposure = 0
  let prevSolved = 0
  let prevScanCount = 0
  let resultSent = false
  let lastActivityBroadcast = 0
  let timer: ReturnType<typeof setInterval> | null = null

  /* ---------------- kärna: dispatch ---------------- */

  function dispatch(action: Action): void {
    const next = reduce(state.value, action)
    if (next === state.value) return
    state.value = next
    applyEffects()
    broadcast()
  }

  function applyEffects(): void {
    const s = state.value
    // Ljud på meningsfulla övergångar.
    if (s.scanCount !== prevScanCount) audio.play('render')
    if (s.exposure > prevExposure) audio.play('deny')
    if (s.lastResult?.correct && s.solvedIds.length > prevSolved) audio.play('lockin')
    if (prevPhase !== 'verdict' && s.phase === 'verdict') {
      audio.play(s.outcome === 'win' ? 'win' : 'deny')
    }
    // State ut (ljus/ljud-rigg) + resultat en gång vid verdict.
    seam.value?.state.set(stateSignal(s))
    if (s.phase === 'verdict' && !resultSent) {
      resultSent = true
      // Resultat skickas bara skarpt (ej under övning).
      if (s.datasetId === LIVE_DATASET_ID) seam.value?.result.send(buildResultPayload())
    }
    if (s.phase !== 'verdict') resultSent = false

    prevPhase = s.phase
    prevExposure = s.exposure
    prevSolved = s.solvedIds.length
    prevScanCount = s.scanCount
  }

  /* ---------------- transport ---------------- */

  function plainState(): GameState {
    return JSON.parse(JSON.stringify(state.value)) as GameState
  }

  function broadcast(): void {
    seam.value?.transport.send({ kind: 'snapshot', payload: plainState() })
  }

  function onMessage(msg: TransportMessage): void {
    switch (msg.kind) {
      case 'snapshot': {
        const next = reduce(state.value, { type: 'sync', state: msg.payload as GameState })
        if (next !== state.value) {
          state.value = next
          applyEffects()
        }
        break
      }
      case 'hello': {
        // Sen-ansluten skärm → ge den full bild.
        broadcast()
        seam.value?.transport.send({ kind: 'onbStage', payload: { stage: onbStage.value, epoch: onbEpoch.value } })
        if (paused.value) seam.value?.transport.send({ kind: 'pause', payload: { paused: true, since: now.value } })
        break
      }
      case 'onbStage': {
        const p = msg.payload as { stage: OnbStage; epoch: number | null }
        if (p.stage !== onbStage.value) {
          onbStage.value = p.stage
          onbEpoch.value = p.epoch
          onbReady.value = { lag1: false, lag2: false }
        }
        break
      }
      case 'onbReady': {
        const p = msg.payload as { vault: ValvId }
        onbReady.value = { ...onbReady.value, [p.vault]: true }
        break
      }
      case 'pause': {
        const p = msg.payload as { paused: boolean }
        paused.value = p.paused
        break
      }
      case 'sessionReset':
        doReset(false)
        break
      case 'activity':
        notifyActivity(false)
        break
    }
  }

  /* ---------------- onboarding ---------------- */

  function onbGoto(stage: OnbStage, epoch: number | null = null): void {
    if (stage === onbStage.value) return
    onbStage.value = stage
    onbEpoch.value = epoch
    onbReady.value = { lag1: false, lag2: false }
    seam.value?.transport.send({ kind: 'onbStage', payload: { stage, epoch } })
  }

  function onbMarkReady(vault: ValvId): void {
    if (onbReady.value[vault]) return
    onbReady.value = { ...onbReady.value, [vault]: true }
    seam.value?.transport.send({ kind: 'onbReady', payload: { vault } })
  }

  /* ---------------- scan-söm → motor-actions ---------------- */

  /** Översätter en scan-händelse (tagg/id) till en motor-action. */
  function handleScanEvent(ev: ScanEvent): void {
    if (ev.kind === 'scan') {
      const ds = datasetById(state.value.datasetId)
      const c = ds.cases.find((x) => x.tag === ev.tag)
      if (c) dispatch({ type: 'scan', caseId: c.id })
    } else if (ev.kind === 'confirm') {
      dispatch({ type: 'confirm', virusId: ev.id })
    } else if (ev.kind === 'home') {
      dispatch({ type: 'clearActive' })
    }
  }

  // Pilot-UI (skärmknappar) går genom SAMMA väg som drift-sömmen.
  function scanCase(caseId: string): void {
    const ds = datasetById(state.value.datasetId)
    const c = ds.cases.find((x) => x.id === caseId)
    if (c) handleScanEvent({ kind: 'scan', tag: c.tag })
    notifyActivity()
  }
  function confirmVirus(virusId: string): void {
    handleScanEvent({ kind: 'confirm', id: virusId })
    notifyActivity()
  }
  function clearActive(): void {
    dispatch({ type: 'clearActive' })
    notifyActivity()
  }

  /* ---------------- omgångsstart ---------------- */

  function start(datasetId: string): void {
    const ds = datasetById(datasetId)
    dispatch({
      type: 'start',
      datasetId: ds.id,
      cases: ds.cases.map((c) => ({ id: c.id, answer: c.answer })),
      exposureMax: config.exposureMax,
    })
    audio.play('live')
  }
  function startPractice(): void {
    start(PRACTICE_DATASET.id)
  }
  function startLive(): void {
    start(LIVE_DATASET_ID)
  }

  /* ---------------- resultat ---------------- */

  function buildResultPayload(): ResultPayload {
    const pr = personResults(state.value)
    const sum = (team: ValvId) => pr[team].reduce((a, p) => a + p.result_value, 0)
    return {
      grupp: 'pilot',
      rollresultat_A: sum('lag1'),
      rollresultat_B: sum('lag2'),
      personer: [...pr.lag1, ...pr.lag2],
    }
  }

  /* ---------------- paus / idle / reset ---------------- */

  function setPaused(p: boolean): void {
    paused.value = p
    seam.value?.transport.send({ kind: 'pause', payload: { paused: p, since: now.value } })
  }
  function togglePause(): void {
    setPaused(!paused.value)
  }

  function notifyActivity(broadcastIt = true): void {
    lastActivityAt.value = Date.now()
    if (broadcastIt && Date.now() - lastActivityBroadcast > 3000) {
      lastActivityBroadcast = Date.now()
      seam.value?.transport.send({ kind: 'activity', payload: null })
    }
  }

  function setSessionActive(v: boolean): void {
    sessionActive.value = v
    if (v) lastActivityAt.value = Date.now()
  }

  function doReset(broadcastIt = true): void {
    dispatch({ type: 'reset', members: defaultRoster() })
    onbStage.value = 'opening'
    onbEpoch.value = null
    onbReady.value = { lag1: false, lag2: false }
    paused.value = false
    resultSent = false
    seam.value?.state.reset()
    resetSignal.value += 1
    if (broadcastIt) seam.value?.transport.send({ kind: 'sessionReset', payload: null })
  }
  function reset(): void {
    doReset(true)
  }

  const idleWarn = computed(() => {
    if (!sessionActive.value || !leader.value || IDLE_MS === 0) return false
    const idle = now.value - lastActivityAt.value
    return idle >= IDLE_MS - IDLE_RESTART.warnSeconds * 1000 && idle < IDLE_MS
  })
  const idleSecondsLeft = computed(() =>
    Math.max(0, Math.ceil((IDLE_MS - (now.value - lastActivityAt.value)) / 1000)),
  )

  /* ---------------- härledda värden för UI ---------------- */

  const dataset = computed(() => datasetById(state.value.datasetId))
  /** Bankens virus denna omgång. */
  const bank = computed<Virus[]>(() =>
    dataset.value.bank.map((id) => virusById(id)).filter((v): v is Virus => !!v),
  )
  /** Aktivt prov (config-innehåll: särdrag + bild). */
  const activeCase = computed<SampleCase | null>(() => {
    const id = state.value.activeCaseId
    if (!id) return null
    return dataset.value.cases.find((c) => c.id === id) ?? null
  })
  /** Provstatus för fält-konsolen (scannad/löst). */
  const caseStatuses = computed(() =>
    dataset.value.cases.map((c) => ({
      id: c.id,
      scanned: state.value.scannedIds.includes(c.id),
      solved: state.value.solvedIds.includes(c.id),
      active: state.value.activeCaseId === c.id,
    })),
  )

  const phase = computed(() => state.value.phase)
  const outcome = computed(() => state.value.outcome)
  const exposure = computed(() => state.value.exposure)
  const exposureMax = computed(() => state.value.exposureMax)
  const solvedCount = computed(() => state.value.solvedIds.length)
  const totalCount = computed(() => state.value.cases.length)
  const lastResult = computed(() => state.value.lastResult)
  const score = computed(() => roundScore(state.value))

  function valvRole(v: ViewSide) {
    return v === 'shared' ? null : VALV[v]
  }
  function setView(v: ViewSide): void {
    view.value = v
    if (typeof window !== 'undefined') window.location.hash = v
  }

  /* ---------------- livscykel ---------------- */

  function init(): void {
    if (!seam.value) seam.value = createSeam()
    seam.value.transport.subscribe(onMessage)
    seam.value.scan.subscribe(handleScanEvent)
    seam.value.transport.send({ kind: 'hello', payload: null })
    timer = setInterval(() => {
      now.value = Date.now()
      if (leader.value && sessionActive.value && IDLE_MS > 0) {
        if (now.value - lastActivityAt.value >= IDLE_MS) doReset(true)
      }
    }, 1000)
  }

  function dispose(): void {
    if (timer) clearInterval(timer)
    timer = null
    seam.value?.transport.close()
    seam.value?.scan.close()
  }

  return {
    // state/härlett
    state,
    view,
    leader,
    onbStage,
    onbEpoch,
    onbReady,
    paused,
    sessionActive,
    now,
    resetSignal,
    idleWarn,
    idleSecondsLeft,
    dataset,
    bank,
    activeCase,
    caseStatuses,
    phase,
    outcome,
    exposure,
    exposureMax,
    solvedCount,
    totalCount,
    lastResult,
    score,
    valvRole,
    caseById: (id: string | null) => caseById(state.value, id),
    // onboarding
    onbGoto,
    onbMarkReady,
    // actions
    scanCase,
    confirmVirus,
    clearActive,
    start,
    startPractice,
    startLive,
    reset,
    setView,
    setPaused,
    togglePause,
    notifyActivity,
    setSessionActive,
    buildResultPayload,
    // livscykel
    init,
    dispose,
  }
})
