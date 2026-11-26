<script setup lang="ts">
/**
 * SKANNINGEN SOM ETT MOMENT (Josef 2026-11-26: "feedback för att 'yes, du hittade' mycket viktig här").
 * Varje NYTT avtryck (ny spot i state.revealedSpotIds) spelas upp i helskärm över fältets skärm:
 *
 *   1. ANALYS (~1,3 s)  "ANALYSERAR AVTRYCK…" — avtrycket med en skanningslinje, en mätare som fylls,
 *                        "jämför med övervakningsarkivet". Ljud/ljus kom redan vid skanningen (store:
 *                        render-svep + vitt blink på fältets underglow = "skannern hittade något").
 *   2. SVAR (2 s)       person: porträttet i helskärm + "AVTRYCKET TILLHÖR" + NAMN + kläder,
 *                        grönt blink (gest 'ratt') + kanon-ljudet 'inom'. Utsmetat: "OANVÄNDBART
 *                        AVTRYCK" + rött blink (gest 'fel').
 *   3. I PÅSEN (0,8 s)  bilden krymper och glider ner i sin bevispåse ([data-pase] på Brottsplatsen);
 *                        står man vid ett annat bord glider den ner mot bordskanten.
 * Flera skanningar i rad köas (analysen kortas då). Ett redan skannat avtryck spelas inte upp igen.
 */
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { SPOTS, personById, asset, type Person } from '@/config'
import { useLjus } from '@/station-kit/ljus'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import { analysSvar } from '../../../ljus'
import { FALT_TEXT } from './faltText'

const T = FALT_TEXT.analys
const ANALYS_MS = 1300
const ANALYS_KO_MS = 700
const SVAR_MS = 2000
const IN_MS = 800

const store = useUndersokningenStore()
const ljus = useLjus()

type Fas = 'analys' | 'svar' | 'in'
interface Visning { spotId: string; person: Person | null; nr: number }

const ko: Visning[] = []
const nu = ref<Visning | null>(null)
const fas = ref<Fas>('analys')
/** Flyget ner i påsen: förflyttning + skala (px), räknas ur påsens plats. */
const flyg = ref<{ x: number; y: number; s: number } | null>(null)
const kort = ref<HTMLElement | null>(null)
let tmr: ReturnType<typeof setTimeout>[] = []
const rensa = () => { tmr.forEach(clearTimeout); tmr = [] }

function personFor(spotId: string): Person | null {
  const s = SPOTS.find((x) => x.id === spotId)
  return s && s.person !== 'smudge' ? (personById(s.person) ?? null) : null
}

function spela(v: Visning, kort_: boolean): void {
  nu.value = v
  fas.value = 'analys'
  flyg.value = null
  tmr.push(setTimeout(() => {
    fas.value = 'svar'
    analysSvar(ljus, v.person ? 'person' : 'smudge')
    tmr.push(setTimeout(() => void flygNer(v), SVAR_MS))
  }, kort_ ? ANALYS_KO_MS : ANALYS_MS))
}

async function flygNer(v: Visning): Promise<void> {
  fas.value = 'in'
  await nextTick()
  const el = kort.value
  const mal = document.querySelector<HTMLElement>(`[data-pase="${v.spotId}"]`)
  if (el) {
    const a = el.getBoundingClientRect()
    if (mal && mal.offsetParent !== null) {
      const b = mal.getBoundingClientRect()
      flyg.value = {
        x: b.left + b.width / 2 - (a.left + a.width / 2),
        y: b.top + b.height / 2 - (a.top + a.height / 2),
        s: Math.max(0.08, Math.min(b.width / a.width, b.height / a.height)),
      }
    } else {
      // Inget synligt bevisbord (man står vid utredningsbordet) → ner mot bordskanten.
      flyg.value = { x: 0, y: window.innerHeight * 0.45, s: 0.12 }
    }
  }
  tmr.push(setTimeout(() => {
    nu.value = null
    flyg.value = null
    const nasta = ko.shift()
    if (nasta) spela(nasta, true)
  }, IN_MS))
}

/* Nya avtryck = nya spots i revealedSpotIds (i ordning). Omladdning/nollställning spelar inget. */
let kanda = new Set(store.state.revealedSpotIds)
watch(
  () => store.state.revealedSpotIds.slice(),
  (ids) => {
    if (store.phase !== 'investigate') { kanda = new Set(ids); return }
    for (const id of ids) {
      if (kanda.has(id)) continue
      kanda.add(id)
      const v: Visning = { spotId: id, person: personFor(id), nr: ids.indexOf(id) + 1 }
      if (nu.value) ko.push(v)
      else spela(v, false)
    }
  },
)
watch(
  () => store.resetSignal,
  () => {
    rensa()
    ko.length = 0
    nu.value = null
    kanda = new Set(store.state.revealedSpotIds)
  },
)
onUnmounted(rensa)
</script>

<template>
  <Transition name="ska">
    <div v-if="nu" class="ska" :class="`ska--${fas}`" aria-live="assertive">
      <!-- 1. Analys -->
      <div v-if="fas === 'analys'" class="ska__analys">
        <svg class="ska__fp" viewBox="-40 -40 80 80" aria-hidden="true">
          <g class="ska__fp-linjer">
            <path d="M -6 10 A 6 6 0 0 1 6 10" /><path d="M -12 12 A 12 12 0 0 1 12 12" />
            <path d="M -18 14 A 18 18 0 0 1 18 14" /><path d="M -24 16 A 24 22 0 0 1 24 16" />
            <path d="M -29 18 A 29 27 0 0 1 29 18" /><path d="M -10 -14 A 14 12 0 0 1 14 -10" />
            <path d="M -20 -6 A 22 20 0 0 1 22 -2" />
          </g>
          <rect class="ska__linje" x="-38" y="-2" width="76" height="4" />
        </svg>
        <p class="ska__titel">{{ T.analyserar }}</p>
        <div class="ska__matare"><i /></div>
        <p class="ska__under mono">{{ T.jamfor }}</p>
      </div>

      <!-- 2–3. Svar → ner i påsen -->
      <div v-else class="ska__svar">
        <p class="ska__etikett mono">{{ nu.person ? T.tillhor : T.oanvandbart }}</p>
        <div
          ref="kort" class="ska__flyg"
          :style="flyg ? { transform: `translate(${flyg.x}px, ${flyg.y}px) scale(${flyg.s})` } : undefined"
        >
        <div class="ska__kort" :class="{ 'ska__kort--smet': !nu.person }">
          <template v-if="nu.person">
            <img :src="asset(nu.person.image)" :alt="nu.person.name" />
            <span class="ska__namn">{{ nu.person.name.toUpperCase() }}</span>
          </template>
          <template v-else>
            <span class="ska__smet" aria-hidden="true" />
            <span class="ska__namn">{{ T.utsmetat }}</span>
          </template>
        </div>
        </div>
        <p class="ska__klader">{{ nu.person ? nu.person.clothing : T.smetUnder }}</p>
        <p class="ska__pase mono">{{ T.paseNr(nu.nr) }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ska { position: absolute; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; background: rgba(2, 6, 4, 0.9); }
.ska--in { background: rgba(2, 6, 4, 0.55); transition: background 0.8s; }
.ska-enter-active { transition: opacity 0.2s ease-out; }
.ska-leave-active { transition: opacity 0.25s ease-in; }
.ska-enter-from, .ska-leave-to { opacity: 0; }

/* 1. Analys */
.ska__analys { display: flex; flex-direction: column; align-items: center; gap: clamp(0.6rem, 2vh, 1.2rem); }
.ska__fp { width: clamp(9rem, 28vmin, 18rem); height: auto; }
.ska__fp-linjer path { fill: none; stroke: var(--color-primary); stroke-width: 2.4; stroke-linecap: round; opacity: 0.85;
  stroke-dasharray: 60; stroke-dashoffset: 60; animation: ska-rita 0.9s ease-out forwards; }
.ska__fp-linjer path:nth-child(2) { animation-delay: 0.08s; } .ska__fp-linjer path:nth-child(3) { animation-delay: 0.16s; }
.ska__fp-linjer path:nth-child(4) { animation-delay: 0.24s; } .ska__fp-linjer path:nth-child(5) { animation-delay: 0.32s; }
.ska__fp-linjer path:nth-child(6) { animation-delay: 0.4s; } .ska__fp-linjer path:nth-child(7) { animation-delay: 0.48s; }
.ska__linje { fill: var(--color-ink-strong); opacity: 0.8; filter: drop-shadow(0 0 6px var(--color-primary)); animation: ska-svep 0.65s ease-in-out infinite alternate; }
.ska__titel { margin: 0; font-family: var(--font-retro); font-size: clamp(2rem, 6vmin, 4rem); letter-spacing: 0.06em; color: var(--color-primary); text-shadow: var(--glow-strong); animation: ska-blink 0.5s steps(2) infinite; }
.ska__matare { width: clamp(14rem, 40vmin, 26rem); height: 0.9rem; border: 2px solid var(--color-primary-dim); border-radius: 999px; overflow: hidden; }
.ska__matare i { display: block; height: 100%; width: 0; background: var(--color-primary); box-shadow: var(--glow-soft); animation: ska-fyll 1.2s ease-in forwards; }
.ska__under { margin: 0; font-size: clamp(0.9rem, 2vmin, 1.2rem); color: var(--color-ink-muted); }

/* 2. Svar */
.ska__svar { display: flex; flex-direction: column; align-items: center; gap: clamp(0.4rem, 1.4vh, 0.9rem); }
.ska__etikett { margin: 0; font-size: clamp(1.1rem, 2.8vmin, 1.8rem); letter-spacing: 0.18em; color: var(--color-primary); }
.ska__flyg { transform-origin: center; transition: transform 0.8s cubic-bezier(0.55, 0, 0.3, 1); }
.ska__kort {
  position: relative; width: clamp(16rem, 52vmin, 34rem); background: #f3eee2; padding: 0.8rem 0.8rem 3.4rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
  animation: ska-pop 380ms cubic-bezier(0.2, 1.5, 0.4, 1) both;
}
.ska__kort img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #111; }
.ska__namn { position: absolute; left: 0.9rem; right: 0.9rem; bottom: 0.7rem; font-family: var(--font-retro); font-size: clamp(1.6rem, 4.6vmin, 3rem); color: #1d1d1d; line-height: 1; }
.ska__kort--smet { background: #d9d4c8; }
.ska__smet { display: block; width: 100%; aspect-ratio: 4 / 3; background: radial-gradient(circle, rgba(120, 120, 120, 0.85) 0%, rgba(150, 150, 150, 0.3) 45%, #2a2a2a 72%); }
.ska__klader { margin: 0; font-family: var(--font-mono); font-size: clamp(1rem, 2.6vmin, 1.6rem); color: var(--color-ink-strong); }
.ska__pase { margin: 0; font-size: clamp(0.9rem, 2vmin, 1.2rem); color: var(--color-ink-muted); }
.ska--in .ska__etikett, .ska--in .ska__klader, .ska--in .ska__pase { opacity: 0; transition: opacity 0.25s; }

@keyframes ska-rita { to { stroke-dashoffset: 0; } }
@keyframes ska-svep { from { transform: translateY(-34px); } to { transform: translateY(34px); } }
@keyframes ska-blink { 50% { opacity: 0.55; } }
@keyframes ska-fyll { to { width: 100%; } }
@keyframes ska-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .ska__fp-linjer path, .ska__linje, .ska__titel, .ska__matare i, .ska__kort { animation: none; }
  .ska__fp-linjer path { stroke-dashoffset: 0; }
  .ska__matare i { width: 100%; }
}
</style>
