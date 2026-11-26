<script setup lang="ts">
/**
 * FÄLTETS plats 1 · BROTTSPLATSEN (docs/STEGFLODE-FORSLAG.md §3.2, stillbild 2-brottsplatsen.jpg).
 *
 * Överst en loopande bild av HANDLINGEN (UV-pennan lyser → avtrycket tänds → skannern hålls mot det),
 * som tonar ner när första skanningen kommit. Under den BEVISBORDET: 9 tomma bevispåsar som fylls i
 * skanningsordning (porträtt + förnamn, "utsmetat", "×2"). Ingen popup — påsen landar och en kort rad
 * "IDENTIFIERAD: …" visas medan `state.activeSpotId` är satt (FaltConsole stänger den efter ~2 s).
 * Loggen syns inte här (låst flik). Utvägen "Vi hittar inga fler ▸" efter UTVAG_EFTER_SEK om ≥ 6 skannade.
 * Pilot (?pilot=1): tryck på en tom påse = skanna nästa oskannade spot.
 */
import { computed } from 'vue'
import { SPOTS, personById, asset, UTVAG_EFTER_SEK, type Person } from '@/config'
import { pilotUi } from '@/station-kit/kiosk/kioskSkip'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import { FALT_TEXT, fornamn } from './faltText'

const T = FALT_TEXT.brott
const UTVAG_MIN_SKANNADE = 6

const store = useUndersokningenStore()
const pilot = pilotUi()

interface Pase {
  spotId: string
  person: Person | null
  /** Hur många gånger personen syns t.o.m. den här påsen (2 → "×2"). */
  n: number
}

function personFor(spotId: string): Person | null {
  const s = SPOTS.find((x) => x.id === spotId)
  return s && s.person !== 'smudge' ? (personById(s.person) ?? null) : null
}

const skannade = computed(() => store.state.revealedSpotIds)
const pasar = computed<(Pase | null)[]>(() =>
  SPOTS.map((_, i) => {
    const spotId = skannade.value[i]
    if (!spotId) return null
    const person = personFor(spotId)
    const n = person ? skannade.value.slice(0, i + 1).filter((id) => personFor(id)?.id === person.id).length : 0
    return { spotId, person, n }
  }),
)
const antal = computed(() => Math.min(skannade.value.length, SPOTS.length))

/** Den senaste skanningen (raden "IDENTIFIERAD: …" + påsen lyser). */
const aktivId = computed(() => store.state.activeSpotId)
const aktivPerson = computed(() => (aktivId.value ? personFor(aktivId.value) : null))

const utvag = computed(() => {
  const start = store.state.startedAt
  if (!start || antal.value < UTVAG_MIN_SKANNADE) return false
  return (store.now - start) / 1000 >= UTVAG_EFTER_SEK
})

function pilotSkanna(): void {
  const nasta = SPOTS.find((s) => !skannade.value.includes(s.id))
  if (nasta) store.scanSpot(nasta.id)
}
</script>

<template>
  <div class="brott">
    <header class="pl-huvud">
      <h2 class="pl-titel">{{ T.titel }}</h2>
      <p class="pl-uppdrag">{{ T.uppdrag }}</p>
    </header>

    <div class="pl-bord brott__bord">
      <!-- Handlingen: UV-pennan + skannern (loopar; tonar ner efter första skanningen) -->
      <section class="brott__gor" :class="{ 'brott__gor--ner': antal > 0 }">
        <svg class="handling" viewBox="0 0 360 170" aria-hidden="true">
          <defs>
            <linearGradient id="brott-uv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#b47cff" stop-opacity="0.85" />
              <stop offset="1" stop-color="#7a3cff" stop-opacity="0.1" />
            </linearGradient>
          </defs>
          <rect class="handling__yta" x="18" y="100" width="324" height="56" rx="8" />
          <g class="handling__fp" transform="translate(180 128)">
            <path d="M -4 7 A 4 4 0 0 1 4 7" />
            <path d="M -8 9 A 8 8 0 0 1 8 9" />
            <path d="M -12 10 A 12 12 0 0 1 12 10" />
            <path d="M -16 11 A 16 16 0 0 1 16 11" />
            <path d="M -19 12 A 19 18 0 0 1 19 12" />
          </g>
          <circle class="handling__ring" cx="180" cy="130" r="12" />
          <g class="handling__penna">
            <polygon class="handling__strale" points="120,60 156,148 212,148" fill="url(#brott-uv)" />
            <line class="handling__kropp" x1="48" y1="20" x2="116" y2="57" />
            <circle class="handling__spets" cx="120" cy="60" r="5" />
          </g>
          <g class="handling__skanner">
            <rect class="handling__sk-kropp" x="145" y="66" width="70" height="44" rx="8" />
            <rect class="handling__sk-skarm" x="153" y="74" width="54" height="18" rx="3" />
            <text class="handling__sk-text" x="180" y="87">{{ T.skanna }}</text>
            <rect class="handling__sk-nos" x="171" y="110" width="18" height="7" rx="2" />
          </g>
        </svg>
        <div class="brott__gor-text">
          <p class="brott__gor-rad">{{ T.gor1 }}<br />{{ T.gor2 }}</p>
          <p class="brott__gor-under">{{ T.gorUnder }}</p>
        </div>
      </section>

      <!-- Raden för senaste skanningen (ersätter popupen) -->
      <div class="brott__id-plats" aria-live="polite">
        <Transition name="brott-id">
          <p v-if="aktivId" :key="aktivId" class="brott__id">
            <template v-if="aktivPerson">
              {{ T.identifierad }} <b>{{ aktivPerson.name.toUpperCase() }}</b> · {{ aktivPerson.clothing }}
            </template>
            <template v-else>{{ T.smetRad }}</template>
          </p>
        </Transition>
      </div>

      <!-- Bevisbordet: 9 påsar i skanningsordning -->
      <section class="bevis">
        <component
          :is="!p && pilot ? 'button' : 'div'"
          v-for="(p, i) in pasar" :key="i"
          :type="!p && pilot ? 'button' : undefined"
          class="pase"
          :class="{ 'pase--tom': !p, 'pase--aktiv': p && p.spotId === aktivId, 'pase--pilot': !p && pilot }"
          :title="!p && pilot ? T.pilotTryck : undefined"
          @click="!p && pilot ? pilotSkanna() : undefined"
        >
          <span class="pase__remsa">{{ T.bevis }}</span>
          <Transition name="pase-land">
            <div v-if="p" :key="p.spotId" class="pase__inne">
              <template v-if="p.person">
                <div class="pl-pol pase__pol"><img :src="asset(p.person.image)" :alt="p.person.name" /></div>
                <span class="pase__namn" :class="{ 'pase__namn--igen': p.n > 1 }">
                  {{ fornamn(p.person.name) + (p.n > 1 ? ' ' + T.gganger(p.n) : '') }}
                </span>
              </template>
              <template v-else>
                <span class="pase__smet" aria-hidden="true" />
                <span class="pase__namn pase__namn--smet">{{ T.utsmetat }}</span>
              </template>
            </div>
            <span v-else class="pase__nr" aria-hidden="true">{{ i + 1 }}</span>
          </Transition>
        </component>
      </section>

      <footer class="brott__fot">
        <span class="pl-raknare">{{ T.raknare }} <b>{{ antal }}</b> {{ T.av(SPOTS.length) }}</span>
        <button v-if="utvag" type="button" class="pl-utvag" @click="store.gaVidare('brott')">{{ T.utvag }}</button>
        <span class="brott__last">
          <svg viewBox="0 0 20 22" width="18" height="20" aria-hidden="true">
            <rect x="2" y="9" width="16" height="12" rx="2" fill="currentColor" />
            <path d="M5.5 9 V6 a4.5 4.5 0 0 1 9 0 V9" fill="none" stroke="currentColor" stroke-width="2.4" />
          </svg>
          {{ T.lastLogg }}
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.brott { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; container: brott / inline-size; }
.brott .pl-titel { white-space: nowrap; }
.brott .pl-uppdrag { min-width: 0; }
.brott__bord { display: flex; flex-direction: column; gap: clamp(0.4rem, 1.4vh, 1rem); padding: clamp(0.7rem, 2cqi, 1.6rem); }

/* ---- handlingen ---- */
.brott__gor { flex: none; display: flex; align-items: center; gap: clamp(0.8rem, 3cqi, 2.4rem); transition: opacity 600ms ease; }
.brott__gor--ner { opacity: 0.35; }
.handling {
  flex: none; width: clamp(13rem, 40cqi, 30rem); height: auto; max-height: 28vh;
  border-radius: 10px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.06);
}
.brott__gor-text { min-width: 0; }
.brott__gor-rad { margin: 0; font-family: var(--font-retro); font-size: clamp(1.6rem, 4.6cqi, 3.2rem); line-height: 1.1; color: var(--color-ink-strong); }
.brott__gor-under { margin: 0.4rem 0 0; font-family: var(--font-mono); font-size: clamp(0.9rem, 1.9cqi, 1.3rem); color: var(--color-ink-muted); }

.handling__yta { fill: #3a3430; stroke: rgba(255, 255, 255, 0.08); }
.handling__fp path { fill: none; stroke: #5b5070; stroke-width: 2.2; stroke-linecap: round; animation: h-fp 5s ease-in-out infinite; }
.handling__ring { fill: none; stroke: var(--color-primary); stroke-width: 2.5; opacity: 0; transform-box: fill-box; transform-origin: center; animation: h-ring 5s ease-out infinite; }
.handling__penna { animation: h-penna 5s ease-in-out infinite; }
.handling__strale { animation: h-strale 5s ease-in-out infinite; }
.handling__kropp { stroke: #cfd2d8; stroke-width: 12; stroke-linecap: round; }
.handling__spets { fill: #a36bff; }
.handling__skanner { animation: h-skanner 5s ease-in-out infinite; }
.handling__sk-kropp { fill: #d9822b; stroke: #8a4d12; stroke-width: 2; }
.handling__sk-skarm { fill: #1b1410; animation: h-skarm 5s linear infinite; }
.handling__sk-text { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; fill: #f0b46a; text-anchor: middle; }
.handling__sk-nos { fill: #8a4d12; }

@keyframes h-penna {
  0% { transform: translate(-70px, -14px); opacity: 0; }
  8% { opacity: 1; }
  30%, 44% { transform: translate(0, 0); opacity: 1; }
  54%, 100% { transform: translate(-40px, -24px); opacity: 0; }
}
@keyframes h-strale { 0%, 12% { opacity: 0; } 20%, 44% { opacity: 0.9; } 52%, 100% { opacity: 0; } }
@keyframes h-fp {
  0%, 18% { stroke: #5b5070; opacity: 0.45; filter: none; }
  28%, 84% { stroke: #c9a2ff; opacity: 1; filter: drop-shadow(0 0 4px #a36bff); }
  94%, 100% { stroke: #5b5070; opacity: 0.45; filter: none; }
}
@keyframes h-skanner {
  0%, 44% { transform: translate(120px, -100px); opacity: 0; }
  50% { opacity: 1; }
  62%, 80% { transform: translate(0, 0); opacity: 1; }
  92%, 100% { transform: translate(120px, -100px); opacity: 0; }
}
@keyframes h-skarm { 0%, 63% { fill: #1b1410; } 64%, 78% { fill: #2f6b3a; } 79%, 100% { fill: #1b1410; } }
@keyframes h-ring { 0%, 63% { opacity: 0; transform: scale(0.5); } 65% { opacity: 0.95; transform: scale(0.6); } 82%, 100% { opacity: 0; transform: scale(2.6); } }

/* ---- IDENTIFIERAD-raden ---- */
.brott__id-plats { flex: none; min-height: 2.2em; display: flex; align-items: center; justify-content: center; font-size: clamp(1.05rem, 2.5cqi, 1.75rem); }
.brott__id {
  margin: 0; padding: 0.25em 0.9em; border: 2px solid var(--color-primary); border-radius: 8px; background: rgba(5, 16, 11, 0.85);
  font-family: var(--font-mono); color: var(--color-ink-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.brott__id b { color: var(--color-primary); font-weight: 700; }
.brott-id-enter-active { transition: opacity 200ms ease, transform 240ms cubic-bezier(0.2, 1.2, 0.4, 1); }
.brott-id-leave-active { transition: opacity 300ms ease; position: absolute; }
.brott-id-enter-from { opacity: 0; transform: translateY(8px) scale(0.97); }
.brott-id-leave-to { opacity: 0; }

/* ---- bevisbordet ---- */
.bevis {
  flex: 1 1 auto; min-height: 0; display: grid; align-content: center;
  grid-template-columns: repeat(9, minmax(0, 1fr)); gap: clamp(0.35rem, 1cqi, 0.9rem);
}
@container brott (max-width: 1100px) { .bevis { grid-template-columns: repeat(5, minmax(0, 1fr)); } }

.pase {
  position: relative; min-width: 0; aspect-ratio: 3 / 4; max-height: 32vh;
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0 0.35rem 0.45rem;
  border: 1.5px solid rgba(225, 230, 240, 0.38); border-radius: 6px 6px 12px 12px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.14) 0 18%, transparent 30% 62%, rgba(255, 255, 255, 0.07) 72%, transparent 84%),
    rgba(255, 255, 255, 0.05);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  font: inherit; color: inherit; text-align: center;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.pase--tom { border-style: dashed; border-color: rgba(225, 230, 240, 0.22); background: rgba(255, 255, 255, 0.025); box-shadow: none; }
.pase--pilot { cursor: pointer; }
.pase--pilot:active { transform: scale(0.97); }
.pase--aktiv { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary), var(--glow-strong); }
.pase__remsa {
  flex: none; align-self: stretch; margin: 0 -0.35rem; padding: 0.15em 0 0.2em; border-radius: 5px 5px 0 0;
  border-bottom: 2px dotted rgba(255, 255, 255, 0.35);
  background: #9e1f1a; color: #f3eee2; font-family: var(--font-mono); font-weight: 600;
  font-size: clamp(0.6rem, 1.1cqi, 0.85rem); letter-spacing: 0.22em;
}
.pase--tom .pase__remsa { background: rgba(158, 31, 26, 0.55); }
.pase__nr { margin: auto; font-family: var(--font-retro); font-size: clamp(1.4rem, 3cqi, 2.4rem); color: rgba(255, 255, 255, 0.12); }
.pase__inne { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; }
.pase__pol { width: 88%; padding: 0.25rem 0.25rem 0.55rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); transform: rotate(-2deg); }
.pase:nth-child(even) .pase__pol { transform: rotate(2.5deg); }
.pase__namn { font-family: var(--font-retro); font-size: clamp(1.1rem, 2.8cqi, 2rem); line-height: 1; color: var(--color-ink-strong); white-space: nowrap; }
.pase__namn--igen { color: var(--color-primary); }
.pase__namn--smet { font-family: var(--font-mono); font-size: clamp(0.72rem, 1.3cqi, 1rem); color: var(--color-ink-muted); }
.pase__smet {
  width: 64%; aspect-ratio: 1; border-radius: 50%; filter: blur(3px);
  background: radial-gradient(circle, rgba(180, 180, 180, 0.6), rgba(130, 130, 130, 0.25) 55%, transparent 72%);
}

/* Påsen "landar": innehållet faller ner i påsen */
.pase-land-enter-active { animation: pase-land 520ms cubic-bezier(0.2, 1.3, 0.4, 1) both; }
.pase-land-leave-active { display: none; }
@keyframes pase-land {
  from { opacity: 0; transform: translateY(-45%) scale(1.25) rotate(-8deg); }
  to { opacity: 1; transform: none; }
}

/* ---- foten ---- */
.brott__fot { flex: none; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.brott__fot .pl-utvag { margin-left: auto; }
.brott__last {
  margin-left: auto; display: inline-flex; align-items: center; gap: 0.5em; padding: 0.35em 0.9em;
  border: 2px dashed rgba(255, 255, 255, 0.18); border-radius: 8px;
  font-family: var(--font-mono); font-size: clamp(0.8rem, 1.4cqi, 1.05rem); color: var(--color-ink-muted); opacity: 0.75;
}
.brott__fot .pl-utvag + .brott__last { margin-left: 0; }

@media (prefers-reduced-motion: reduce) {
  .handling__fp path, .handling__ring, .handling__penna, .handling__strale, .handling__skanner, .handling__sk-skarm { animation: none; }
  .handling__fp path { stroke: #c9a2ff; }
  .handling__penna { opacity: 0; }
  .pase-land-enter-active { animation: none; }
}
</style>
