<script setup lang="ts">
/**
 * ★ TAVLAN — sista platsen, samma på båda skärmarna (docs/STEGFLODE-FORSLAG.md §6, Josef 2026-11-26):
 * en anslagstavla med de misstänkta som polaroider. Varje sida sätter SIN nål (A varmvit, B magenta),
 * och den andra sidans nål syns direkt. Olika → "NI TROR OLIKA — prata ihop er" (orange blink).
 * Samma → "NI ÄR ÖVERENS" + stämpeln UTPEKAD + ÅNGRA i 5 s (som Förhandlingens Klubba) → utfallet.
 * Tiden ute avgör INTE av sig själv: tavlan står kvar tills de enas.
 */
import { computed, watch } from 'vue'
import { PERSONS, asset, type ValvId } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { useUndersokningenStore } from '../../store/undersokningenStore'
import { tiderFor } from '../../logg/logg'
import { BADA } from '../../ljus'
import './platser.css'

const props = defineProps<{ vault: ValvId }>()
const store = useUndersokningenStore()
const ljus = useLjus()

/** Polaroiderna: fältets misstänkta, annars alla skannade, annars alla som var i valvet (aldrig tomt). */
const kort = computed(() => {
  if (store.suspects.length) return store.suspects
  if (store.revealedPersons.length) return store.revealedPersons
  return PERSONS
})
const picks = computed(() => store.picks)
const min = computed(() => picks.value[props.vault])
const annanVault = computed<ValvId>(() => (props.vault === 'lag1' ? 'lag2' : 'lag1'))
const annan = computed(() => picks.value[annanVault.value])
const annanNamn = computed(() => (props.vault === 'lag1' ? 'Fältet' : 'Labbet'))
const namn = (id: string | null) => PERSONS.find((p) => p.id === id)?.name ?? ''
const fornamn = (id: string | null) => namn(id).split(' ')[0]

type Lage = 'ingen' | 'en' | 'olika' | 'overens'
const lage = computed<Lage>(() => {
  const p = picks.value
  if (store.overensOm) return 'overens'
  if (p.lag1 && p.lag2) return 'olika'
  if (p.lag1 || p.lag2) return 'en'
  return 'ingen'
})
const tidenUte = computed(() => store.secondsLeft <= 0)
/** Efter utfallet står tavlan kvar (delad vy, vänster halva) — utan knappar. */
const aktiv = computed(() => store.phase === 'verdict')
const kanTillbaka = computed(() => store.secondsLeft > 0 && lage.value !== 'overens')
const mmss = computed(() => {
  const s = store.secondsLeft
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

function satt(id: string): void {
  if (min.value === id) return
  store.pickThief(props.vault, id)
  audio.play('confirm')
}
function angra(): void {
  store.pickThief(props.vault, null)
  audio.play('nobuy')
}

// Gemensamma händelser (olika / överens) hörs och syns EN gång: ledarfönstret, och i delad vy bara vänstra halvan.
const spelarLjud = computed(() => store.leader && props.vault === 'lag1')
watch(lage, (l, fore) => {
  if (!spelarLjud.value || l === fore) return
  if (l === 'olika') {
    audio.play('deny')
    ljus.gest('oenig', BADA, { tyst: true })
  } else if (l === 'overens') {
    audio.play('lockin')
    setTimeout(() => audio.play('stamp'), 450)
  }
})
</script>

<template>
  <div class="tv">
    <div
      class="tv__band"
      :class="{ 'tv__band--olika': lage === 'olika', 'tv__band--overens': lage === 'overens' }"
    >
      <template v-if="lage === 'overens'">
        <span class="tv__band-stor">NI ÄR ÖVERENS: {{ namn(store.overensOm).toUpperCase() }}</span>
        <button v-if="aktiv" type="button" class="tv__angra" @click="angra">ÅNGRA ({{ store.angraKvar }})</button>
      </template>
      <template v-else-if="lage === 'olika'">
        <span class="tv__band-stor">NI TROR OLIKA</span>
        <span class="tv__band-sub">Labbet: {{ fornamn(picks.lag1) }} · Fältet: {{ fornamn(picks.lag2) }} — prata ihop er och flytta en nål.</span>
      </template>
      <template v-else-if="lage === 'en'">
        <span class="tv__band-stor">★ VEM ÄR TJUVEN?</span>
        <span class="tv__band-sub">{{ min ? `Ni valde ${fornamn(min)} · väntar på ${annanNamn.toLowerCase()} …` : `${annanNamn} valde ${fornamn(annan)}. Sätt er nål.` }}</span>
      </template>
      <template v-else>
        <span class="tv__band-stor">★ VEM ÄR TJUVEN?</span>
        <span class="tv__band-sub">Sätt er nål på den ni tror är tjuven — båda sidor måste välja samma.</span>
      </template>
      <span class="tv__tid mono" :class="{ 'tv__tid--ute': tidenUte }">{{ tidenUte ? 'TIDEN ÄR UTE — NI MÅSTE ENAS' : mmss }}</span>
    </div>

    <div class="tv__kork">
      <button
        v-for="p in kort" :key="p.id" type="button" class="tv__kort pl-pol"
        :class="{ 'tv__kort--min': min === p.id }" :disabled="lage === 'overens' || !aktiv" @click="satt(p.id)"
      >
        <img :src="asset(p.image)" :alt="p.name" />
        <span class="pl-pol__cap">{{ p.name.toUpperCase() }}</span>
        <span class="tv__nalar">
          <span v-if="picks.lag1 === p.id" class="tv__nal tv__nal--a" title="Labbets nål" />
          <span v-if="picks.lag2 === p.id" class="tv__nal tv__nal--b" title="Fältets nål" />
        </span>
        <span class="tv__notis mono">
          <template v-if="store.hairMatch === p.id"><b>✓ håret matchar</b> · </template>{{ tiderFor(store.linksFor(p.id)) ?? '' }}
        </span>
        <span v-if="store.overensOm === p.id" class="pl-stamp pl-stamp--or pl-stamp--in tv__utpekad">UTPEKAD</span>
      </button>
    </div>

    <div class="tv__fot">
      <span class="tv__legend"><span class="tv__nal tv__nal--a" /> LABBET (sida A)</span>
      <span class="tv__legend"><span class="tv__nal tv__nal--b" /> FÄLTET (sida B)</span>
      <button v-if="aktiv && min && lage !== 'overens'" type="button" class="tv__knapp" @click="angra">Ta bort vår nål</button>
      <button v-if="aktiv && kanTillbaka" type="button" class="tv__knapp tv__knapp--tillbaka" @click="store.closeVerdict()">◂ TILLBAKA TILL BORDET</button>
    </div>
  </div>
</template>

<style scoped>
.tv { display: flex; flex-direction: column; gap: 0.6rem; height: 100%; min-height: 0; }
.tv__band {
  flex: none; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 0.6rem 1rem;
  border: 2px solid var(--color-primary-dim); border-radius: 12px; background: var(--color-background-2);
}
.tv__band--olika { border-color: var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.12); animation: tv-blink 0.45s ease-in-out 4; }
.tv__band--overens { border-color: #7ad14f; background: rgba(122, 209, 79, 0.12); }
.tv__band-stor { font-family: var(--font-retro); font-size: clamp(1.6rem, 3vw, 2.6rem); letter-spacing: 0.05em; color: var(--color-ink-strong); }
.tv__band--olika .tv__band-stor { color: var(--color-primary); }
.tv__band-sub { font-family: var(--font-mono); font-size: clamp(0.95rem, 1.5vw, 1.25rem); color: var(--color-ink-strong); }
.tv__tid { margin-left: auto; font-family: var(--font-retro); font-size: clamp(1.4rem, 2.4vw, 2rem); color: var(--color-ink-strong); }
.tv__tid--ute { color: var(--color-danger); font-size: clamp(1rem, 1.8vw, 1.4rem); }
.tv__angra {
  font-family: var(--font-retro); font-size: clamp(1.3rem, 2.2vw, 1.8rem); padding: 0.15em 0.8em; cursor: pointer;
  color: var(--color-ink-strong); background: transparent; border: 2px solid var(--color-ink-strong); border-radius: 10px;
}

.tv__kork {
  flex: 1; min-height: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: clamp(1rem, 3vw, 2.6rem);
  padding: clamp(0.8rem, 2vw, 1.6rem); border-radius: 14px; border: 2px solid var(--color-primary-dim);
  background-color: #b78a55;
  background-image: radial-gradient(rgba(90, 55, 20, 0.35) 1px, transparent 1.6px), radial-gradient(rgba(255, 235, 200, 0.18) 1px, transparent 1.6px);
  background-size: 9px 9px, 13px 13px; overflow: auto;
}
.tv__kort { width: clamp(11rem, 30%, 22rem); cursor: pointer; border: 0; text-align: left; transform: rotate(-1.5deg); transition: transform 160ms ease-out, box-shadow 160ms ease-out; }
.tv__kort:nth-child(even) { transform: rotate(1.5deg); }
.tv__kort:active { transform: scale(0.97); }
.tv__kort--min { box-shadow: 0 0 0 4px var(--color-primary), 0 10px 22px rgba(0, 0, 0, 0.55); }
.tv__kort:disabled { cursor: default; }
.tv__nalar { position: absolute; top: -0.9rem; left: 50%; translate: -50% 0; display: flex; gap: 0.2rem; }
.tv__nal { display: inline-block; width: 1.9rem; height: 1.9rem; border-radius: 50%; box-shadow: 2px 5px 6px rgba(0, 0, 0, 0.5), inset -4px -4px 0 rgba(0, 0, 0, 0.15); vertical-align: middle; }
.tv__nalar .tv__nal { animation: tv-nal 220ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.tv__nal--a { background: #fff1d6; }
.tv__nal--b { background: #ff3cc8; }
.tv__notis { position: absolute; left: 0; right: 0; top: 100%; margin-top: 0.4rem; font-size: clamp(0.8rem, 1.2vw, 1rem); color: #1d1d1d; text-align: center; }
.tv__notis b { color: #8a3d00; }
.tv__utpekad { left: 8%; top: 32%; }

.tv__fot { flex: none; display: flex; align-items: center; gap: 1.4rem; flex-wrap: wrap; padding: 0 0.4rem; font-family: var(--font-mono); color: var(--color-ink-muted); }
.tv__legend { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(0.85rem, 1.3vw, 1.1rem); }
.tv__legend .tv__nal { width: 1.1rem; height: 1.1rem; }
.tv__knapp { font-family: var(--font-mono); font-size: clamp(0.9rem, 1.3vw, 1.1rem); color: var(--color-ink-muted); background: transparent; border: 2px solid var(--color-primary-dim); border-radius: 10px; padding: 0.35em 0.9em; cursor: pointer; }
.tv__knapp--tillbaka { margin-left: auto; color: var(--color-primary); }

@keyframes tv-blink { 50% { box-shadow: 0 0 0 4px var(--color-primary); } }
@keyframes tv-nal { from { transform: translateY(-14px) scale(1.4); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .tv__band--olika, .tv__nalar .tv__nal { animation: none; } }
</style>
