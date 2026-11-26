<script setup lang="ts">
/**
 * FÄLTKONSOL (sida B) = tunn PLATSVÄXLARE i stegflödet (docs/STEGFLODE-FORSLAG.md §3–§5).
 * Inget grund-UI: en plats i taget — 1 · Brottsplatsen → 2 · Utredningsbordet → klar (väntar vid tavlan).
 * Platsen härleds ur speltillståndet (`store.faltPlats`); vid ett steg framåt slår stämpeln
 * "✓ … KLAR" (confirm + kvittogest) och bordet glider åt sidan (`pl-glid`). Remsan längst ner visar
 * platsprickarna, timern, labbets framsteg och TILL TAVLAN ▸.
 *
 * Här sitter också stängningen av skanningsraden: `state.activeSpotId` (senaste skanningen) nollas
 * efter ~2 s, oavsett vilket bord som visas (skannar man efter utvägen syns en kort rad i stället).
 * Används både helskärm (#lag2) och i halv bredd (#shared) — platserna skalar med container-enheter.
 */
import './platser/platser.css'
import { computed, ref, watch, onUnmounted } from 'vue'
import { asset, personById, PROV_IDS, SPOTS, type Person } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { useHoppa } from '@/station-kit/kiosk/kioskSkip'
import { useUndersokningenStore } from '../store/undersokningenStore'
import type { FaltPlats } from '../engine/platser'
import { tiderFor } from '../logg/logg'
import { FALT } from '../ljus'
import PlatsRemsa from './platser/PlatsRemsa.vue'
import Brottsplatsen from './platser/falt/Brottsplatsen.vue'
import Utredningsbordet from './platser/falt/Utredningsbordet.vue'
import { FALT_TEXT, fornamn } from './platser/falt/faltText'

const R = FALT_TEXT.remsa
const K = FALT_TEXT.klar
const L = FALT_TEXT.labb
const ORDNING: FaltPlats[] = ['brottsplats', 'utredning', 'klar']
/** Väntan innan KLAR-stämpeln: låt sista påsen landa / sista polaroiden åka iväg. */
const VANTA_MS: Record<FaltPlats, number> = { brottsplats: 500, utredning: 1500, klar: 0 }
const KLAR_MS = 1200
const SKANNING_SYNS_MS = 2200

const store = useUndersokningenStore()
const ljus = useLjus()

/* ---- platsväxlaren ---- */
const visad = ref<FaltPlats>(store.faltPlats)
const klarText = ref<string | null>(null)
let timers: ReturnType<typeof setTimeout>[] = []
function rensa(): void {
  timers.forEach(clearTimeout)
  timers = []
}
watch(
  () => store.faltPlats,
  (ny) => {
    rensa()
    klarText.value = null
    const fran = visad.value
    if (ORDNING.indexOf(ny) <= ORDNING.indexOf(fran)) {
      visad.value = ny // bakåt (ny skanning efter utvägen, nollställning) → direkt, ingen stämpel
      return
    }
    timers.push(
      setTimeout(() => {
        klarText.value = fran === 'brottsplats' ? FALT_TEXT.klarStampel.brottsplats : FALT_TEXT.klarStampel.utredning
        audio.play('confirm')
        ljus.gest('kvitto', [FALT], { tyst: true })
        timers.push(
          setTimeout(() => {
            klarText.value = null
            visad.value = store.faltPlats
          }, KLAR_MS),
        )
      }, VANTA_MS[fran]),
    )
  },
)
watch(
  () => store.resetSignal,
  () => {
    rensa()
    klarText.value = null
    visad.value = store.faltPlats
  },
)

/* ---- senaste skanningen: syns ~2 s, sedan stängs den ---- */
let skanTmr: ReturnType<typeof setTimeout> | undefined
watch(
  () => store.state.activeSpotId,
  (id) => {
    clearTimeout(skanTmr)
    if (id) skanTmr = setTimeout(() => store.closePopup(), SKANNING_SYNS_MS)
  },
  { immediate: true },
)
/** Skanning medan man står vid ett annat bord än brottsplatsen (efter utvägen). */
const sentAvtryck = computed(() => {
  const id = store.state.activeSpotId
  if (!id || visad.value === 'brottsplats') return null
  const spot = SPOTS.find((s) => s.id === id)
  const p = spot && spot.person !== 'smudge' ? personById(spot.person) : null
  return p ? FALT_TEXT.sentAvtryck(fornamn(p.name)) : FALT_TEXT.sentSmet
})

onUnmounted(() => {
  rensa()
  clearTimeout(skanTmr)
})

/* ---- kiosk-hoppet (facilitatorn): brottsplatsen → utredningsbordet ---- */
useHoppa(() => {
  if (store.faltPlats !== 'brottsplats') return false
  store.gaVidare('brott')
  return true
})

/* ---- remsan ---- */
const platser = [
  { id: 'brottsplats', namn: R.brottsplats },
  { id: 'utredning', namn: R.utredning },
  { id: 'tavlan', namn: R.tavlan },
]
const aktiv = computed(() => (visad.value === 'klar' ? 'tavlan' : visad.value))
const matchPerson = computed(() => (store.hairMatch ? (personById(store.hairMatch) ?? null) : null))
/** Labbet just nu (rad ovanför remsan). */
const annan = computed(() => {
  const l = store.state.labb ?? { prov: [], manniska: 0, etiketter: 0 }
  switch (store.labbPlats) {
    case 'mikroskop':
      return L.prov(l.prov.length, PROV_IDS.length)
    case 'ljusbord':
      return L.farg(l.etiketter, l.manniska)
    case 'rorpost':
      return store.suspects.length ? L.jamfor : L.vantar
    default:
      return matchPerson.value ? L.matchar(fornamn(matchPerson.value.name)) : ''
  }
})

/* ---- klar-vyn: alla polaroider stämplade ---- */
const granskade = computed(() =>
  store.state.revealedPersonIds
    .map((id) => personById(id))
    .filter((p): p is Person => !!p)
    .map((p) => ({ person: p, misstankt: store.state.judged?.[p.id] === true, tider: tiderFor(store.linksFor(p.id)) })),
)
</script>

<template>
  <div class="pl-plats falt">
    <div class="falt__yta">
      <Transition name="pl-glid">
        <Brottsplatsen v-if="visad === 'brottsplats'" key="brottsplats" />
        <Utredningsbordet v-else-if="visad === 'utredning'" key="utredning" />

        <!-- KLAR: fältet är färdigt och väntar på labbet / tavlan -->
        <div v-else key="klar" class="klar">
          <header class="pl-huvud">
            <h2 class="pl-titel">{{ K.titel }}</h2>
          </header>
          <div class="pl-bord klar__bord">
            <div class="klar__polar">
              <figure v-for="g in granskade" :key="g.person.id" class="klar__fig">
                <div class="pl-pol klar__pol">
                  <img :src="asset(g.person.image)" :alt="g.person.name" />
                  <span class="pl-pol__cap">{{ fornamn(g.person.name).toUpperCase() }}</span>
                  <span class="pl-stamp klar__stamp" :class="{ 'pl-stamp--gra': !g.misstankt }">
                    {{ g.misstankt ? FALT_TEXT.utredning.misstankt : FALT_TEXT.utredning.avskriven }}
                  </span>
                  <span v-if="matchPerson?.id === g.person.id" class="klar__har">✓ HÅR</span>
                </div>
                <figcaption v-if="g.tider" class="klar__tid">{{ g.tider }}</figcaption>
              </figure>
              <p v-if="!granskade.length" class="klar__ingen">{{ K.ingen }}</p>
            </div>

            <div class="klar__kort" :class="{ 'klar__kort--match': !!matchPerson }">
              <template v-if="matchPerson">
                <p class="klar__stor">{{ K.matchar(matchPerson.name) }}</p>
                <p class="klar__liten">{{ K.matcharText }}</p>
              </template>
              <template v-else>
                <p class="klar__stor klar__stor--vantar">{{ K.vantarTitel }}</p>
                <p class="klar__liten">{{ K.vantarText }}</p>
              </template>
            </div>
          </div>
        </div>
      </Transition>

      <span v-if="klarText" class="pl-stamp pl-stamp--or pl-stamp--in pl-klar">{{ klarText }}</span>
      <Transition name="falt-sent">
        <p v-if="sentAvtryck" class="falt__sent">{{ sentAvtryck }}</p>
      </Transition>
    </div>

    <PlatsRemsa
      sida="B" :roll="R.roll" :platser="platser" :aktiv="aktiv" :annan="annan"
      @tavlan="store.openVerdict()"
    />
  </div>
</template>

<style scoped>
.falt__yta { position: relative; flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.falt__yta > :not(.pl-stamp):not(.falt__sent) { flex: 1; min-height: 0; }

.falt__sent {
  position: absolute; left: 50%; top: 0.6rem; z-index: 15; translate: -50% 0; margin: 0; padding: 0.3em 1em;
  border: 2px solid var(--color-primary); border-radius: 8px; background: rgba(5, 16, 11, 0.92);
  font-family: var(--font-mono); font-size: clamp(0.9rem, 1.4vw, 1.2rem); color: var(--color-ink-strong); white-space: nowrap;
}
.falt-sent-enter-active, .falt-sent-leave-active { transition: opacity 250ms ease, transform 250ms ease; }
.falt-sent-enter-from, .falt-sent-leave-to { opacity: 0; transform: translateY(-8px); }

/* ---- klar-vyn ---- */
.klar { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; container: klar / inline-size; }
.klar__bord { display: flex; flex-direction: column; justify-content: center; gap: clamp(1rem, 3vh, 2rem); padding: clamp(0.8rem, 2.4cqi, 1.8rem); }
.klar__polar { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(0.8rem, 2.4cqi, 1.8rem); }
.klar__fig { margin: 0; width: clamp(7rem, 19cqi, 13rem); display: flex; flex-direction: column; gap: 0.4rem; }
.klar__fig:nth-child(odd) .klar__pol { rotate: -2deg; }
.klar__fig:nth-child(even) .klar__pol { rotate: 2.5deg; }
.klar__stamp { left: 50%; top: 38%; translate: -50% -50%; font-size: clamp(1rem, 2.6cqi, 1.8rem); border-width: 4px; }
.klar__tid {
  text-align: center;
  font-family: var(--font-mono); font-size: clamp(0.7rem, 1.3cqi, 0.95rem); color: var(--color-primary);
}
.klar__har {
  position: absolute; right: -0.5rem; top: -0.6rem; padding: 0.1em 0.45em; rotate: 6deg; border-radius: 4px;
  background: var(--color-primary); color: #120b04; font-family: var(--font-mono); font-weight: 700; font-size: clamp(0.7rem, 1.3cqi, 0.95rem);
}
.klar__ingen { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); }
.klar__kort {
  align-self: center; max-width: min(100%, 46rem); padding: clamp(0.8rem, 2.4cqi, 1.5rem) clamp(1rem, 3cqi, 2rem);
  border: 2px solid var(--color-primary-dim); border-radius: 12px; background: rgba(5, 12, 9, 0.88); text-align: center;
}
.klar__kort--match { border-color: var(--color-primary); box-shadow: var(--glow-strong); }
.klar__stor { margin: 0; font-family: var(--font-retro); font-size: clamp(1.8rem, 5cqi, 3.4rem); line-height: 1.05; color: var(--color-primary); text-shadow: var(--glow-soft); }
.klar__stor--vantar { color: var(--color-ink-strong); text-shadow: none; animation: klar-andas 2.4s ease-in-out infinite; }
.klar__liten { margin: 0.5rem 0 0; font-family: var(--font-mono); font-size: clamp(0.95rem, 2cqi, 1.3rem); color: var(--color-ink-muted); }
@keyframes klar-andas { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .klar__stor--vantar { animation: none; } }
</style>
