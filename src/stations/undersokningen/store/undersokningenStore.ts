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
import { tagResult } from '@/station-kit/rotation/rotation'
import { useLjus } from '@/station-kit/ljus'

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
import { BADA, klassaScan, scanFeedback, utfallVid } from '../ljus'

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
  /** Stationsljuset (station-kit/ljus) — no-op tills appen kört initLjus. */
  const ljus = useLjus()
  const seam = shallowRef<Seam | null>(null)

  const view = ref<ViewSide>(viewFromHash())
  const leader = computed(() => view.value === 'shared' || view.value === 'lag1')

  const onbStage = ref<OnbStage>('tutorial')
  const onbReady = ref<Record<ValvId, boolean>>({ lag1: false, lag2: false })
  /** VALdi-introts delade klocka: epoch-ms där introts tid 0 ligger (null = ej startat). Ledaren
   *  startar; ett tryck (hoppa kapitel) flyttar den. Båda skärmarna räknar t = (nu − introStartAt). */
  const introStartAt = ref<number | null>(null)
  /** Vilka skärmar som kommit fram till VALdi-introt. Ledaren startar klockan först när båda är där. */
  const introRedo = ref<Record<ValvId, boolean>>({ lag1: false, lag2: false })

  const paused = ref(false)
  const sessionActive = ref(false)
  const now = ref(Date.now())
  const lastActivityAt = ref(Date.now())
  const resetSignal = ref(0)
  const mqttOn = ref(false)
  const timerEndsAt = ref<number | null>(null)

  let prevPhase: GameState['phase'] | null = null
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
    // Skanningens ljud + ljus sker i scanSpot (fältfönstret, där skanningen händer).
    // Utfallet (vinst/förlust) ses av BÅDA fönstren via snapshot → bara ledaren (= ljusets
    // skrivare, äger den retained basen) tänder det + spelar ljudet — exakt en gång.
    const u = utfallVid(prevPhase, s.phase)
    if (u && leader.value) ljus.utfall(u, BADA)

    seam.value?.state.set(stateSignal(s))
    if ((s.phase === 'solved' || s.phase === 'failed') && !resultSent) {
      resultSent = true
      seam.value?.result.send(tagResult(buildResultPayload()))
    }
    if (s.phase !== 'solved' && s.phase !== 'failed') resultSent = false

    prevPhase = s.phase
  }

  function plainState(): GameState {
    return JSON.parse(JSON.stringify(state.value)) as GameState
  }
  /** Snapshot till andra skärmen. `ledare` = facit vid krock (se gameEngine `sync`). */
  function broadcast(): void {
    seam.value?.transport.send({ kind: 'snapshot', payload: { state: plainState(), ledare: leader.value } })
  }

  function onMessage(msg: TransportMessage): void {
    switch (msg.kind) {
      case 'snapshot': {
        const p = msg.payload as { state: GameState; ledare: boolean }
        if (!p?.state) break
        const next = reduce(state.value, { type: 'sync', state: p.state, fromLeader: p.ledare })
        if (next !== state.value) {
          state.value = next
          applyEffects() // spegling: uppdatera state (ljud/ljus väljer själva fönster)
        } else if (leader.value && !p.ledare && JSON.stringify(p.state) !== JSON.stringify(state.value)) {
          // Följaren har ett annat tillstånd än ledaren (krock eller missad nollställning):
          // skicka ledarens så att följaren rättar sig, i stället för att skärmarna glider isär.
          broadcast()
        }
        break
      }
      case 'hello': {
        broadcast()
        seam.value?.transport.send({ kind: 'onbStage', payload: { stage: onbStage.value } })
        if (timerEndsAt.value) seam.value?.transport.send({ kind: 'timer', payload: timerEndsAt.value })
        if (introStartAt.value) seam.value?.transport.send({ kind: 'introStartAt', payload: { at: introStartAt.value } })
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
      case 'introStartAt':
        introStartAt.value = (msg.payload as { at: number }).at
        break
      case 'introRedo': {
        const v = (msg.payload as { vault: ValvId }).vault
        if (v === 'lag1' || v === 'lag2') introRedo.value = { ...introRedo.value, [v]: true }
        break
      }
      case 'pause':
        paused.value = (msg.payload as { paused: boolean }).paused
        break
      case 'sessionReset':
        doReset(false)
        break
      case 'activity':
        notifyActivity(false)
        break
      case 'quit':
        closeWindow()
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
  /** Sätt introts klocka (start eller hopp) och synka den till andra skärmen. */
  function introStart(at: number): void {
    introStartAt.value = at
    seam.value?.transport.send({ kind: 'introStartAt', payload: { at } })
  }
  /** Den här skärmen är framme vid VALdi-introt (skickas om tills klockan startat — tål missade meddelanden). */
  function introMarkRedo(vault: ValvId): void {
    introRedo.value = { ...introRedo.value, [vault]: true }
    seam.value?.transport.send({ kind: 'introRedo', payload: { vault } })
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
    const u = klassaScan(state.value, spot)
    if (u) scanFeedback(ljus, u)
    dispatch({ type: 'scanSpot', spotId: spot.id, person: spot.person })
    notifyActivity()
  }
  function handleScanEvent(ev: ScanEvent): void {
    if (ev.kind === 'scan') {
      // RFID-sensor: UID → spot (Spot.tag). Fallback: taggen = spot-id (mock/test).
      const spot = SPOTS.find((s) => s.tag && s.tag === ev.tag) ?? SPOTS.find((s) => s.id === ev.tag)
      if (spot) scanSpot(spot.id)
      else {
        // Okänd UID: ignorerades tyst förut → visa att läsaren lever men taggen är okänd.
        const u = klassaScan(state.value, undefined)
        if (u) scanFeedback(ljus, u)
      }
    } else if (ev.kind === 'home') dispatch({ type: 'closePopup' })
  }
  function closePopup(): void {
    dispatch({ type: 'closePopup' })
    notifyActivity()
  }
  /** FÄLT markerar en person som misstänkt (→ topppanelen) eller tar bort. */
  function markSuspect(personId: string, suspect: boolean): void {
    dispatch({ type: 'markSuspect', personId, suspect })
    if (suspect) {
      audio.play('stamp') // stationsljudet behålls → gesten tyst
      ljus.gest('kvitto', BADA, { tyst: true })
    }
    notifyActivity()
  }

  /** FÄLT kopplar en person till rader i händelseloggen ([] = syns inte i loggen). */
  function linkLog(personId: string, entries: number[]): void {
    dispatch({ type: 'linkLog', personId, entries })
    notifyActivity()
  }
  /** Loggraderna FÄLT kopplat till personen, eller null om de inte kopplat än. */
  function linksFor(personId: string): number[] | null {
    return state.value.links?.[personId] ?? null
  }

  /* ---------------- verdikt / omgång ---------------- */

  function startLive(): void {
    dispatch({ type: 'start', thiefId: THIEF_ID, runda: Date.now() })
    const ends = Date.now() + config.timerSeconds * 1000
    timerEndsAt.value = ends
    seam.value?.transport.send({ kind: 'timer', payload: ends })
    // Inget eget 'live'-ljud här: ModeCountdown spelar redan svepet (spelades två gånger).
  }
  function openVerdict(): void {
    dispatch({ type: 'openVerdict' })
    notifyActivity()
  }
  /** Tillbaka till utredningen från verdiktet (bara medan tiden räcker — UI:t avgör). */
  function closeVerdict(): void {
    dispatch({ type: 'closeVerdict' })
    notifyActivity()
  }
  function selectThief(personId: string): void {
    dispatch({ type: 'selectThief', personId })
    notifyActivity()
  }
  function confirmThief(): void {
    dispatch({ type: 'confirmThief' })
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
    introStartAt.value = null
    introRedo.value = { lag1: false, lag2: false }
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

  /** Stäng fönstren → tillbaka till skrivbordet (avsluta-knappen). */
  function closeWindow(): void {
    try {
      window.close()
    } catch {
      /* kan vara blockerat beroende på hur fönstret öppnats — deploy stänger då */
    }
  }
  function quitStation(): void {
    seam.value?.transport.send({ kind: 'quit', payload: null })
    closeWindow()
  }

  /* ---------------- härledda värden ---------------- */

  const phase = computed(() => state.value.phase)
  const outcome = computed(() => state.value.outcome)
  const verdictPick = computed(() => state.value.verdictPick)

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
  /** Misstänkta FÄLT markerat (topppanelen), i markeringsordning. */
  const suspects = computed(() =>
    state.value.suspectIds
      .map((id) => personById(id))
      .filter((p): p is PersonInfo => !!p),
  )
  function isSuspect(personId: string): boolean {
    return state.value.suspectIds.includes(personId)
  }
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
    let hjartslag = 0
    timer = setInterval(() => {
      now.value = Date.now()
      // Hjärtslag: ledaren skickar sitt tillstånd varannan sekund, så en följare som missat
      // ett meddelande (reläet, omladdning) hittar tillbaka utan att någon behöver nollställa.
      if (leader.value && ++hjartslag % 4 === 0) broadcast()
      // Timer slut → tvinga fram verdikt (bara leader driver).
      if (leader.value && state.value.phase === 'investigate' && timerEndsAt.value && now.value >= timerEndsAt.value) {
        dispatch({ type: 'openVerdict' })
        ljus.gest('stanger', BADA) // tiden ute → utredningen stängs
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
    // Släpp den stängda sömmen så en ny init() skapar en färsk (bl.a. vid HMR).
    seam.value = null
  }

  /** Entrén (station-kit/entre) har lottat rollerna → gruppen i spelet (bara ledaren, synkas via snapshot). */
  function setRoster(members: Record<ValvId, Person[]>): void {
    if (leader.value) dispatch({ type: 'setMembers', members })
  }
  /** Skärm↔skärm-transporten (entrén delar röster/lottning över den). */
  function transport() {
    return seam.value?.transport ?? null
  }

  return {
    state,
    setRoster,
    transport,
    view,
    leader,
    onbStage,
    onbReady,
    introStartAt,
    introRedo,
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
    verdictPick,
    activeSpot,
    activePerson,
    activeIsSmudge,
    spotStatuses,
    revealedPersons,
    suspects,
    isSuspect,
    score,
    valvRole,
    setView,
    onbGoto,
    onbMarkReady,
    introStart,
    introMarkRedo,
    scanSpot,
    closePopup,
    markSuspect,
    linkLog,
    linksFor,
    startLive,
    openVerdict,
    closeVerdict,
    selectThief,
    confirmThief,
    reset,
    quitStation,
    setPaused,
    togglePause,
    notifyActivity,
    setSessionActive,
    buildResultPayload,
    init,
    dispose,
  }
})
