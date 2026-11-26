<script setup lang="ts">
/**
 * RÖRPOSTENS ANKOMST i labbet (docs/STEGFLODE-FORSLAG.md §5, stillbild 6-rorposten-ankomst.jpg — Josefs
 * uttryckliga önskemål: ankomsten ska vara ett eget, tydligt steg, inte en puls i en sidopanel).
 *
 * Fältet markerar en ny misstänkt (ny id i store.suspects) →
 *   FÖRSTA gången: skärmen dämpas, en kapsel dunsar ner från HÖGER kant, öppnas och polaroiden fälls ut stort
 *   ("FÄLTET HAR HITTAT EN MISSTÄNKT" + namn + bild). Efter ~2,5 s glider den till rörpostens korg.
 *   Följande: en mindre banderoll uppifrån "+1 MISSTÄNKT: MAJ".
 * Kö om flera kommer. Väntar medan labbet drar/har en fryst bild (labbBord `upptagen`).
 * Ljud/ljus: `popup` + vitt blink på labbets segment (gesten 'oppnar', tyst).
 * Misstänkta som redan fanns vid montering (t.ex. efter omladdning) ger ingen ankomst.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { asset, personById, type Person } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { LABB } from '../../../ljus'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import { LABB_TEXT as T } from './labbText'
import { upptagen } from './labbBord'

const store = useUndersokningenStore()

const STOR_IN_MS = 700 // kapseln dunsar ner
const VISA_MS = 2500 // polaroiden ligger framme
const UT_MS = 650 // glider till korgen
const BAND_MS = 2600

let kanda = new Set(store.suspects.map((p) => p.id))
let visade = kanda.size // fanns det misstänkta redan vid montering → ingen helskärm
const ko = ref<string[]>([])
const aktiv = ref<{ person: Person; stor: boolean } | null>(null)
const steg = ref<'in' | 'oppen' | 'ut'>('in')
const timers: ReturnType<typeof setTimeout>[] = []
const senare = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))

/** Polaroiden ligger i rörposten tills labbet kommer dit (strikt ordning). */
const vantarPlats = computed(() => store.labbPlats === 'mikroskop' || store.labbPlats === 'ljusbord')

watch(
  () => store.suspects.map((p) => p.id),
  (ids) => {
    for (const id of ids) {
      if (kanda.has(id)) continue
      kanda.add(id)
      if (store.phase === 'investigate') ko.value.push(id)
    }
  },
)

function nasta(): void {
  if (aktiv.value || upptagen.value || !ko.value.length) return
  const id = ko.value.shift()!
  const person = personById(id)
  if (!person) return nasta()
  const stor = visade === 0
  visade++
  aktiv.value = { person, stor }
  steg.value = 'in'
  audio.play('popup')
  useLjus().gest('oppnar', [LABB], { tyst: true })
  if (stor) {
    senare(() => (steg.value = 'oppen'), STOR_IN_MS)
    senare(() => (steg.value = 'ut'), STOR_IN_MS + VISA_MS)
    senare(klar, STOR_IN_MS + VISA_MS + UT_MS)
  } else {
    senare(() => (steg.value = 'ut'), BAND_MS)
    senare(klar, BAND_MS + 400)
  }
}
function klar(): void {
  aktiv.value = null
  nasta()
}
watch([() => ko.value.length, upptagen], nasta)

watch(
  () => store.resetSignal,
  () => {
    timers.forEach(clearTimeout)
    timers.length = 0
    kanda = new Set(store.suspects.map((p) => p.id))
    visade = 0
    ko.value = []
    aktiv.value = null
  },
)
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <!-- Första gången: helskärm över labb-konsolen -->
  <div v-if="aktiv?.stor" class="ank" :class="'ank--' + steg" aria-live="assertive">
    <div class="ank__dimma" />
    <p class="ank__rubrik">{{ T.ankomst.rubrik }}</p>
    <div class="ank__kapsel"><span class="ank__lock" /></div>
    <figure class="pl-pol ank__pol">
      <img :src="asset(aktiv.person.image)" :alt="aktiv.person.name" />
      <figcaption class="pl-pol__cap">{{ aktiv.person.name.toUpperCase() }}</figcaption>
    </figure>
    <p v-if="vantarPlats" class="ank__vantar">{{ T.ankomst.vantarPlats }}</p>
  </div>

  <!-- Följande: banderoll uppifrån -->
  <Transition name="ank-band">
    <div v-if="aktiv && !aktiv.stor && steg !== 'ut'" class="ank__band" aria-live="polite">
      <img :src="asset(aktiv.person.image)" alt="" />
      <div>
        <p class="ank__band-text">{{ T.ankomst.banderoll(aktiv.person.name.split(' ')[0].toUpperCase()) }}</p>
        <p v-if="vantarPlats" class="ank__band-sub">{{ T.ankomst.vantarPlats }}</p>
      </div>
      <span class="ank__band-kapsel" aria-hidden="true" />
    </div>
  </Transition>
</template>

<style scoped>
.ank { position: absolute; inset: 0; z-index: 60; overflow: hidden; container-type: size; pointer-events: auto; }
.ank__dimma { position: absolute; inset: 0; background: rgba(2, 5, 4, 0.82); animation: ank-tona 300ms ease-out both; }
.ank--ut .ank__dimma { animation: ank-tona 650ms ease-in reverse both; }
@keyframes ank-tona { from { opacity: 0; } }

.ank__rubrik {
  position: absolute; left: 0; right: 0; top: 7%; margin: 0; text-align: center; z-index: 2;
  font-family: var(--font-retro); font-size: clamp(1.6rem, 5.5cqw, 3.4rem); letter-spacing: 0.03em;
  color: var(--color-ink-strong); text-shadow: var(--glow-strong); opacity: 0;
}
.ank--oppen .ank__rubrik { animation: ank-tona 300ms ease-out both; opacity: 1; }
.ank--ut .ank__rubrik { opacity: 0; transition: opacity 300ms; }

/* Kapseln: mässing, ligger ner, dunsar in från högerkanten */
.ank__kapsel {
  position: absolute; right: 7%; top: 42%; width: clamp(7rem, 22cqw, 14rem); height: clamp(2.8rem, 8cqw, 5rem); z-index: 2;
  border-radius: 999px; background: linear-gradient(180deg, #fbe7a4, #d8b45a 45%, #8a6a2a);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: ank-duns 700ms cubic-bezier(0.3, 0, 0.6, 1) both;
}
.ank__lock { position: absolute; left: 0; top: 0; bottom: 0; width: 26%; border-radius: 999px 0 0 999px; background: linear-gradient(180deg, #e8cf86, #b8913f 50%, #6f521b); border-right: 3px solid #4a3612; }
@keyframes ank-duns {
  0% { transform: translate(60%, -140cqh) rotate(-30deg); }
  70% { transform: translate(0, 0) rotate(-4deg); }
  82% { transform: translate(0, -9%) rotate(-2deg); }
  100% { transform: translate(0, 0) rotate(-4deg); }
}
.ank--oppen .ank__kapsel, .ank--ut .ank__kapsel { animation: ank-oppna 450ms ease-in both; transform: rotate(-4deg); }
.ank--oppen .ank__lock, .ank--ut .ank__lock { animation: ank-lock 450ms ease-out both; }
@keyframes ank-oppna { to { opacity: 0.25; transform: rotate(-4deg) scale(0.85); } }
@keyframes ank-lock { to { transform: translate(-160%, -60%) rotate(-50deg); opacity: 0; } }

/* Polaroiden fälls ut stort */
.ank__pol {
  position: absolute; left: 50%; top: 52%; width: min(62cqw, 70cqh); z-index: 3; margin: 0;
  translate: -50% -50%; opacity: 0;
}
.ank--oppen .ank__pol { opacity: 1; animation: ank-fall-ut 520ms cubic-bezier(0.2, 1.3, 0.4, 1) both; rotate: -2deg; }
.ank--ut .ank__pol { animation: ank-till-korg 650ms cubic-bezier(0.55, 0, 0.9, 0.5) both; }
.ank__pol .pl-pol__cap { font-size: clamp(1rem, 3cqw, 1.8rem); }
@keyframes ank-fall-ut {
  from { opacity: 0; transform: translate(30cqw, -4cqh) scale(0.15) rotate(25deg); }
  to { opacity: 1; transform: none; }
}
@keyframes ank-till-korg {
  from { opacity: 1; transform: rotate(-2deg); }
  to { opacity: 0; transform: translate(44cqw, 12cqh) scale(0.18) rotate(10deg); }
}
.ank__vantar {
  position: absolute; left: 0; right: 0; bottom: 5%; margin: 0; text-align: center; z-index: 2;
  font-family: var(--font-mono); font-size: clamp(0.9rem, 2.4cqw, 1.3rem); color: var(--color-ink-muted); opacity: 0;
}
.ank--oppen .ank__vantar { opacity: 1; transition: opacity 300ms 200ms; }

/* Banderollen */
.ank__band {
  position: absolute; top: 0.6rem; left: 50%; translate: -50% 0; z-index: 60; display: flex; align-items: center; gap: 0.9rem;
  max-width: calc(100% - 1.2rem); padding: 0.5rem 0.9rem 0.5rem 0.5rem; border-radius: 12px;
  border: 3px solid var(--color-primary); background: rgba(5, 12, 9, 0.95); box-shadow: var(--glow-strong), 0 12px 28px rgba(0, 0, 0, 0.6);
}
.ank__band img { width: clamp(3.6rem, 7vw, 5.5rem); aspect-ratio: 4 / 3; object-fit: cover; border: 3px solid #f3eee2; background: #111; }
.ank__band-text { margin: 0; font-family: var(--font-retro); font-size: clamp(1.2rem, 2.8vw, 2rem); color: var(--color-ink-strong); white-space: nowrap; }
.ank__band-sub { margin: 0; font-family: var(--font-mono); font-size: clamp(0.75rem, 1.3vw, 0.95rem); color: var(--color-ink-muted); }
.ank__band-kapsel { flex: none; width: 3.2rem; height: 1.3rem; border-radius: 999px; background: linear-gradient(180deg, #fbe7a4, #d8b45a 45%, #8a6a2a); }
.ank-band-enter-active { transition: transform 380ms cubic-bezier(0.2, 1.3, 0.4, 1), opacity 200ms; }
.ank-band-leave-active { transition: transform 360ms ease-in, opacity 360ms; }
.ank-band-enter-from, .ank-band-leave-to { transform: translateY(-140%); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ank__kapsel, .ank__lock, .ank__pol, .ank__dimma, .ank__rubrik { animation: none !important; }
}
</style>
