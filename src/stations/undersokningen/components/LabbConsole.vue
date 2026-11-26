<script setup lang="ts">
/**
 * LABBET (sida A) — en tunn PLATSVÄXLARE i stegflödet (docs/STEGFLODE-FORSLAG.md §3, Josef 2026-11-26):
 * inget grund-UI, en plats i taget i strikt ordning, härledd ur speltillståndet (store.labbPlats):
 *
 *   MIKROSKOPBORDET (Q1–Q6 i burkar) → LJUSBORDET (färg på människohåren) → RÖRPOSTEN (matcha mot misstänkt)
 *   → klar (samma rörpostbord, "skickat till fältet") → TAVLAN (öppnas av storen / TILL TAVLAN ▸).
 *
 * Bordet glider åt sidan vid platsbyte (pl-glid) med stämpeln "✓ … KLART". Rörpostens ankomst
 * (fältets nya misstänkta) spelas över allt. Remsan längst ner: platserna, fältets framsteg, timer, TILL TAVLAN.
 * Bilderna är LOKALA för labb-fönstret (platser/labb/labbBord.ts) — storen får bara id/antal.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { SPOTS } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { useHoppa } from '@/station-kit/kiosk/kioskSkip'
import { LABB } from '../ljus'
import { useUndersokningenStore } from '../store/undersokningenStore'
import './platser/platser.css'
import PlatsRemsa from './platser/PlatsRemsa.vue'
import Mikroskopbordet from './platser/labb/Mikroskopbordet.vue'
import Ljusbordet from './platser/labb/Ljusbordet.vue'
import Rorposten from './platser/labb/Rorposten.vue'
import RorpostAnkomst from './platser/labb/RorpostAnkomst.vue'
import { LABB_TEXT as T } from './platser/labb/labbText'
import { useLabbBord, useLabbProgress } from './platser/labb/labbBord'

const store = useUndersokningenStore()
useLabbBord()
useLabbProgress()

type Bord = 'mikroskop' | 'ljusbord' | 'rorpost'
const ORDNING: Bord[] = ['mikroskop', 'ljusbord', 'rorpost']
const BORD = { mikroskop: Mikroskopbordet, ljusbord: Ljusbordet, rorpost: Rorposten }

/** 'klar' visar rörpostens bord i klart läge (ingen ny plats → ingen glidning). */
const bord = computed<Bord>(() => (store.labbPlats === 'klar' ? 'rorpost' : store.labbPlats))

/* "✓ MIKROSKOPBORDET KLART" när bordet byts framåt */
const klarStampel = ref<{ text: string; n: number } | null>(null)
let stampelTimer: ReturnType<typeof setTimeout> | null = null
let stampelN = 0
watch(bord, (nu, fore) => {
  if (ORDNING.indexOf(nu) <= ORDNING.indexOf(fore)) return
  if (fore !== 'mikroskop' && fore !== 'ljusbord') return
  klarStampel.value = { text: T.klarStampel[fore], n: ++stampelN }
  audio.play('confirm')
  useLjus().gest('kvitto', [LABB], { tyst: true })
  if (stampelTimer) clearTimeout(stampelTimer)
  stampelTimer = setTimeout(() => (klarStampel.value = null), 1500)
})
watch(
  () => store.resetSignal,
  () => (klarStampel.value = null),
)
onBeforeUnmount(() => {
  if (stampelTimer) clearTimeout(stampelTimer)
})

/* Remsan */
const vantar = computed(() =>
  store.labbPlats === 'mikroskop' || store.labbPlats === 'ljusbord' ? store.suspects.length : 0,
)
const platser = computed(() => [
  { id: 'mikroskop', namn: T.remsa.mikroskop },
  { id: 'ljusbord', namn: T.remsa.ljusbord },
  { id: 'rorpost', namn: vantar.value ? T.remsa.rorpostVantar(vantar.value) : T.remsa.rorpost },
  { id: 'tavlan', namn: T.remsa.tavlan },
])
const aktiv = computed(() => (store.phase === 'verdict' || store.labbPlats === 'klar' ? 'tavlan' : store.labbPlats))
/** Fältet just nu, i en kort rad. */
const falt = computed(() => {
  const s = store.state
  if (store.faltPlats === 'brottsplats') return T.falt.brott(s.revealedSpotIds.length, SPOTS.length)
  if (store.faltPlats === 'utredning') {
    const alla = s.revealedPersonIds.length
    const bedomda = s.revealedPersonIds.filter((id) => id in (s.judged ?? {})).length
    return T.falt.granskar(Math.min(bedomda + 1, alla), alla)
  }
  return T.falt.klar
})

/* Kiosk-hoppet (facilitatorn): gå vidare från bordet man står vid */
useHoppa(() => {
  if (store.phase !== 'investigate') return false
  if (store.labbPlats === 'mikroskop') store.gaVidare('mikroskop')
  else if (store.labbPlats === 'ljusbord') store.gaVidare('ljusbord')
  else return false
  return true
})
</script>

<template>
  <div class="pl-plats lc">
    <div class="lc__scen">
      <Transition name="pl-glid">
        <component :is="BORD[bord]" :key="bord" />
      </Transition>
      <span
        v-if="klarStampel" :key="klarStampel.n"
        class="pl-stamp pl-stamp--or pl-stamp--in pl-klar"
      >{{ klarStampel.text }}</span>
    </div>
    <PlatsRemsa sida="A" :roll="T.remsa.roll" :platser="platser" :aktiv="aktiv" :annan="falt" @tavlan="store.openVerdict()" />
    <RorpostAnkomst />
  </div>
</template>

<style scoped>
.lc__scen { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.lc__scen > :not(.pl-stamp) { height: 100%; }
</style>
