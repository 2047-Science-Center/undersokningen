/**
 * Pinia-store för Stölden — tunt orkestreringslager (ingen spellogik).
 * dispatch→reduce→effekter→broadcast, transport-synk mellan de två valven,
 * tutorial-koordinator (sync-barriär), timer och scan-söm.
 */

import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'

import { audio } from '@/station-kit/audio/AudioEngine'
import type { TransportMessage } from '@/station-kit/adapters/transport/Transport'
import type { ResultPayload } from '@/station-kit/adapters/result/ResultSink'

import {
  config,
  SPOTS,
  personById,
  THIEF_ID,
  VALV,
  IDLE_RESTART,
  type ValvId,
  type Spot,
  type Person as PersonInfo,
} from '@/config'

import { initialState, reduce, stateSignal, scanCountOf, type Action } from '../engine/gameEngine'
import type { GameState, Person } from '../engine/types'
import { personResults, roundScore } from '../engine/scoring'
import { createSeam, type Seam } from '../seam/createSeam'
import type { ScanEvent } from '../seam/Scan'

export type ViewSide = ValvId | 'shared'
export type OnbStage = 'tutorial' | 'live'

const IDLE_MS = IDLE_RESTART.minutes * 60_000

function viewFromHash(): ViewSide {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '')
  return h === 'lag1' || h === 'lag2' || h === 'shared' ? (h as ViewSide) : 'shared'
}

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

  const onbStage = ref<OnbStage>('tutorial')
  const onbReady = ref<Record<ValvId, boolean>>({ lag1: false, lag2: false })

  const paused = ref(false)
  const sessionActive = ref(false)
  const now = ref(Date.now())
  const lastActivityAt = ref(Date.now())
  const resetSignal = ref(0)
  const mqttOn = ref(false)
  const timerEndsAt = ref<number | null>(null)

  let prevPhase: GameState['phase'] | null = null
  let prevUncertainty = 0
  let prevRevealedSpots = 0
  let prevActiveSpot: string | null = null
  let resultSent = false
  let timer: ReturnType<typeof setInterval> | null = null

  /* ---------------- kärna ---------------- */

  function dispatch(action: Action): void {
    const next = reduce(state.value, action)
    if (next === state.value) return
    state.value = next
    applyEffects()
    broadcast()
  }

  function applyEffects(): void {
    const s = state.value
    // Ny scan → ljud beroende på träff/smudge.
    if (s.revealedSpotIds.length !== prevRevealedSpots || s.activeSpotId !== prevActiveSpot) {
      if (s.activeSpotId) {
        const spot = SPOTS.find((sp) => sp.id === s.activeSpotId)
        if (spot) audio.play(spot.person === 'smudge' ? 'deny' : 'render')
      }
    }
    if (s.uncertainty > prevUncertainty) audio.play('deny')
    if (prevPhase !== 'solved' && s.phase === 'solved') audio.play('win')
    if (prevPhase !== 'failed' && s.phase === 'failed') audio.play('deny')

    seam.value?.state.set(stateSignal(s))
    if ((s.phase === 'solved' || s.phase === 'failed') && !resultSent) {
      resultSent = true
      seam.value?.result.send(buildResultPayload())
    }
    if (s.phase !== 'solved' && s.phase !== 'failed') resultSent = false

    prevPhase = s.phase
    prevUncertainty = s.uncertainty
    prevRevealedSpots = s.revealedSpotIds.length
    prevActiveSpot = s.activeSpotId
  }

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
        broadcast()
        seam.value?.transport.send({ kind: 'onbStage', payload: { stage: onbStage.value } })
        if (timerEndsAt.value) seam.value?.transport.send({ kind: 'timer', payload: timerEndsAt.value })
        break
      }
      case 'onbStage': {
        const p = msg.payload as { stage: OnbStage }
        if (p.stage !== onbStage.value) {
          onbStage.value = p.stage
          onbReady.value = { lag1: false, lag2: false }
        }
        break
      }
      case 'onbReady': {
        const p = msg.payload as { vault: ValvId }
        onbReady.value = { ...onbReady.value, [p.vault]: true }
        break
      }
      case 'timer':
        timerEndsAt.value = msg.payload as number
        break
      case 'pause':
        paused.value = (msg.payload as { paused: boolean }).paused
        break
      case 'sessionReset':
        doReset(false)
        break
      case 'activity':
        notifyActivity(false)
        break
    }
  }

  /* ---------------- tutorial ---------------- */

  function onbGoto(stage: OnbStage): void {
    if (stage === onbStage.value) return
    onbStage.value = stage
    onbReady.value = { lag1: false, lag2: false }
    seam.value?.transport.send({ kind: 'onbStage', payload: { stage } })
  }
  function onbMarkReady(vault: ValvId): void {
    if (onbReady.value[vault]) return
    onbReady.value = { ...onbReady.value, [vault]: true }
    seam.value?.transport.send({ kind: 'onbReady', payload: { vault } })
  }

  /* ---------------- scan-söm ---------------- */

  function scanSpot(spotId: string): void {
    const spot = SPOTS.find((s) => s.id === spotId)
    if (!spot) return
    dispatch({ type: 'scanSpot', spotId: spot.id, person: spot.person })
    notifyActivity()
  }
  function handleScanEvent(ev: ScanEvent): void {
    // Drift: taggen = spot-id (s1..s9).
    if (ev.kind === 'scan') scanSpot(ev.tag)
    else if (ev.kind === 'home') dispatch({ type: 'closePopup' })
  }
  function closePopup(): void {
    dispatch({ type: 'closePopup' })
    notifyActivity()
  }

  /* ---------------- verdikt / omgång ---------------- */

  function startLive(): void {
    dispatch({ type: 'start', thiefId: THIEF_ID, uncertaintyMax: 3 })
    const ends = Date.now() + config.timerSeconds * 1000
    timerEndsAt.value = ends
    seam.value?.transport.send({ kind: 'timer', payload: ends })
    audio.play('live')
  }
  function openVerdict(): void {
    dispatch({ type: 'openVerdict' })
    notifyActivity()
  }
  function pickThief(personId: string): void {
    dispatch({ type: 'pickThief', personId })
    notifyActivity()
  }

  /* ---------------- resultat ---------------- */

  function buildResultPayload(): ResultPayload {
    const pr = personResults(state.value)
    const sum = (team: ValvId) => pr[team].reduce((a, p) => a + p.result_value, 0)
    return { grupp: 'pilot', rollresultat_A: sum('lag1'), rollresultat_B: sum('lag2'), personer: [...pr.lag1, ...pr.lag2] }
  }

  /* ---------------- paus / idle / reset ---------------- */

  function setPaused(p: boolean): void {
    paused.value = p
    seam.value?.transport.send({ kind: 'pause', payload: { paused: p } })
  }
  function togglePause(): void {
    setPaused(!paused.value)
  }
  function notifyActivity(broadcastIt = true): void {
    lastActivityAt.value = Date.now()
    if (broadcastIt) seam.value?.transport.send({ kind: 'activity', payload: null })
  }
  function setSessionActive(v: boolean): void {
    sessionActive.value = v
    if (v) lastActivityAt.value = Date.now()
  }
  function doReset(broadcastIt = true): void {
    dispatch({ type: 'reset', members: defaultRoster() })
    onbStage.value = 'tutorial'
    onbReady.value = { lag1: false, lag2: false }
    paused.value = false
    resultSent = false
    timerEndsAt.value = null
    seam.value?.state.reset()
    resetSignal.value += 1
    if (broadcastIt) seam.value?.transport.send({ kind: 'sessionReset', payload: null })
  }
  function reset(): void {
    doReset(true)
  }

  /* ---------------- härledda värden ---------------- */

  const phase = computed(() => state.value.phase)
  const outcome = computed(() => state.value.outcome)
  const uncertainty = computed(() => state.value.uncertainty)
  const uncertaintyMax = computed(() => state.value.uncertaintyMax)

  const activeSpot = computed<Spot | null>(() =>
    state.value.activeSpotId ? (SPOTS.find((s) => s.id === state.value.activeSpotId) ?? null) : null,
  )
  const activePerson = computed<PersonInfo | null>(() => {
    const sp = activeSpot.value
    if (!sp || sp.person === 'smudge') return null
    return personById(sp.person) ?? null
  })
  const activeIsSmudge = computed(() => activeSpot.value?.person === 'smudge')

  const spotStatuses = computed(() =>
    SPOTS.map((s) => ({ ...s, scanned: state.value.revealedSpotIds.includes(s.id) })),
  )
  /** Personer man scannat fram (verdikt-galleriet), med avtrycks-räknare. */
  const revealedPersons = computed(() =>
    state.value.revealedPersonIds
      .map((id) => personById(id))
      .filter((p): p is PersonInfo => !!p)
      .map((p) => ({ ...p, count: scanCountOf(state.value, p.id) })),
  )
  const score = computed(() => roundScore(state.value))

  const secondsLeft = computed(() => {
    if (!timerEndsAt.value) return config.timerSeconds
    return Math.max(0, Math.ceil((timerEndsAt.value - now.value) / 1000))
  })
  const timerWarn = computed(() => secondsLeft.value > 0 && secondsLeft.value <= config.timerWarnAt)

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
    mqttOn.value = !!seam.value.mqtt
    seam.value.transport.subscribe(onMessage)
    // Bara FÄLT-fönstret prenumererar på scan-söm (annars dubbelhantering).
    if (view.value === 'lag2' || view.value === 'shared') seam.value.scan.subscribe(handleScanEvent)
    seam.value.transport.send({ kind: 'hello', payload: null })
    timer = setInterval(() => {
      now.value = Date.now()
      // Timer slut → tvinga fram verdikt (bara leader driver).
      if (leader.value && state.value.phase === 'investigate' && timerEndsAt.value && now.value >= timerEndsAt.value) {
        dispatch({ type: 'openVerdict' })
      }
      if (leader.value && sessionActive.value && IDLE_MS > 0 && now.value - lastActivityAt.value >= IDLE_MS) {
        doReset(true)
      }
    }, 500)
  }
  function dispose(): void {
    if (timer) clearInterval(timer)
    timer = null
    seam.value?.transport.close()
    seam.value?.scan.close()
    seam.value?.mqtt?.end()
  }

  return {
    state,
    view,
    leader,
    onbStage,
    onbReady,
    paused,
    sessionActive,
    now,
    resetSignal,
    mqttOn,
    timerEndsAt,
    secondsLeft,
    timerWarn,
    phase,
    outcome,
    uncertainty,
    uncertaintyMax,
    activeSpot,
    activePerson,
    activeIsSmudge,
    spotStatuses,
    revealedPersons,
    score,
    valvRole,
    setView,
    onbGoto,
    onbMarkReady,
    scanSpot,
    closePopup,
    startLive,
    openVerdict,
    pickThief,
    reset,
    setPaused,
    togglePause,
    notifyActivity,
    setSessionActive,
    buildResultPayload,
    init,
    dispose,
  }
})
