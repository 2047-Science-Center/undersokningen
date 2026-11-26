import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initLjus, useLjus, __resetLjusForTest, type LjusClient } from '@/station-kit/ljus/stationLjus'
import { audio } from '@/station-kit/audio/AudioEngine'
import { LJUS, SPOTS } from '@/config'
import { initialState, reduce } from './engine/gameEngine'
import { KANON_SFX, appLage, klassaScan, scanFeedback, utfallVid, varningsNiva } from './ljus'

type Msg = { topic: string; payload: any; retain: boolean }

function fakeClient() {
  const sent: Msg[] = []
  const c: LjusClient = {
    publish: (topic, payload, o) => sent.push({ topic, payload: JSON.parse(payload), retain: !!o?.retain }),
    subscribe: () => undefined,
    on: () => undefined,
  }
  return { c, sent }
}

const ravi = SPOTS.find((s) => s.person === 'ravi')!
const smudge = SPOTS.find((s) => s.person === 'smudge')!
const live = () => reduce(initialState(), { type: 'start', thiefId: 'ravi' })

describe('Undersökningen → ljus: skanningar', () => {
  it('klassar ny / dubblett / smudge / okänd — och inget utanför utredningen', () => {
    const s = live()
    expect(klassaScan(s, ravi)).toBe('ny')
    const efter = reduce(s, { type: 'scanSpot', spotId: ravi.id, person: ravi.person })
    expect(klassaScan(efter, ravi)).toBe('dubblett')
    expect(klassaScan(s, smudge)).toBe('smudge')
    expect(klassaScan(s, undefined)).toBe('okand')
    expect(klassaScan(initialState(), ravi)).toBeNull()
  })

  describe('gest på fältsegmentet B', () => {
    let f: ReturnType<typeof fakeClient>
    const spelat: string[] = []
    beforeEach(() => {
      __resetLjusForTest()
      vi.useFakeTimers()
      vi.setSystemTime(1_000_000)
      spelat.length = 0
      vi.spyOn(audio, 'play').mockImplementation((sfx) => void spelat.push(sfx))
      f = fakeClient()
      initLjus(
        { stationN: 3, enabled: true, mqttUrl: '', valv: LJUS.valv, segment: LJUS.segment, spela: (n) => spelat.push('kanon:' + n) },
        f.c,
      )
    })
    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })
    const fb = () => f.sent.filter((m) => m.topic === 'station3/feedback').at(-1)!.payload

    it('ny skanning: kvitto på B, appens popup-ljud i stället för kanon (inte dubbelt)', () => {
      scanFeedback(useLjus(), 'ny')
      expect(fb().gest).toBe('kvitto')
      expect(fb().segments.map((s: { id: string }) => s.id)).toEqual(['B'])
      expect(spelat).toEqual(['popup'])
    })
    it('smudge: fel på B med kanon-ljudet fel', () => {
      scanFeedback(useLjus(), 'smudge')
      expect(fb().gest).toBe('fel')
      expect(spelat).toEqual(['kanon:fel'])
    })
    it('okänd UID: fel på B + kanon kvitto-fel', () => {
      scanFeedback(useLjus(), 'okand')
      expect(fb()).toMatchObject({ gest: 'fel', segments: [{ id: 'B', from: 70, to: 140 }] })
      expect(spelat).toEqual(['kanon:kvitto-fel'])
    })
  })
})

describe('Undersökningen → ljus: tid, utfall, läge, ljud', () => {
  it('varning: ≤15 s andning, ≤5 s blink, av när timern inte går', () => {
    expect(varningsNiva(60, true)).toBe(0)
    expect(varningsNiva(15, true)).toBe(1)
    expect(varningsNiva(6, true)).toBe(1)
    expect(varningsNiva(5, true)).toBe(2)
    expect(varningsNiva(0, true)).toBe(0)
    expect(varningsNiva(3, false)).toBe(0)
  })
  it('utfall bara vid verdict → solved/failed (inte vid omladdning/spegling av ett färdigt utfall)', () => {
    expect(utfallVid('verdict', 'solved')).toBe('vinst')
    expect(utfallVid('verdict', 'failed')).toBe('forlust')
    expect(utfallVid(null, 'solved')).toBeNull()
    expect(utfallVid('solved', 'solved')).toBeNull()
    expect(utfallVid('investigate', 'verdict')).toBeNull()
  })
  it('appens egna lägen när rotationen är av', () => {
    expect(appLage({ entered: false, entreDone: false, onboarded: false })).toBeNull()
    expect(appLage({ entered: true, entreDone: false, onboarded: false })).toBeNull()
    expect(appLage({ entered: true, entreDone: true, onboarded: false })).toBe('tutorial')
    expect(appLage({ entered: true, entreDone: true, onboarded: true })).toBe('skarp')
  })
  it('varje kanon-ljud har en Sfx i appen', () => {
    for (const sfx of Object.values(KANON_SFX)) expect(typeof sfx).toBe('string')
    expect(KANON_SFX.vinst).toBe('win')
    expect(KANON_SFX.fel).toBe('deny')
  })
})
