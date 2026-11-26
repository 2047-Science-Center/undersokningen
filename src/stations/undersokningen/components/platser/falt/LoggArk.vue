<script setup lang="ts">
/**
 * Loggen som ett maskinskrivet PAPPERSARK (utredningsbordet, docs/STEGFLODE-FORSLAG.md §3.2,
 * stillbild 5-utredningsbordet.jpg). Rubrik = LOG.header, varje rad: tid i fetstil + texten, klädorden
 * understrukna (klippKlader). Inringning = röd penna (SVG-ellips, `.pl-penna` ritar den); tryck igen = sudda.
 * Andra personers inringningar ligger kvar tunnare/blekare, så man ser vilka rader som redan är "tagna".
 * Hela texten syns alltid (raden bryter hellre än att kapas) — arket rullar bara om det inte får plats.
 */
import { LOG } from '@/config'
import { klippKlader } from '../../../logg/logg'

withDefaults(
  defineProps<{
    /** Raderna som är inringade för personen på bordet just nu. */
    valda: number[]
    /** Raderna som är inringade för tidigare personer (ritas tunnare/blekare). */
    tidigare?: number[]
    /** Sant = raderna går att trycka på (koppla-steget). */
    kanValja: boolean
  }>(),
  { tidigare: () => [] },
)
const emit = defineEmits<{ vaxla: [i: number] }>()

const bitar = LOG.entries.map((e) => klippKlader(e.text))
/** Lite olika lutning per rad → ser handritat ut. */
const LUT = [-0.35, 0.25, -0.2, 0.35, -0.25, 0.2, -0.35, 0.3, -0.15]
</script>

<template>
  <div class="ark">
    <div class="pl-papper ark__papper">
      <p class="ark__huvud">{{ LOG.header }}</p>
      <ol class="ark__rader">
        <li v-for="(e, i) in LOG.entries" :key="i" class="ark__li">
          <button
            type="button" class="ark__rad"
            :class="{ 'ark__rad--val': kanValja, 'ark__rad--on': valda.includes(i) }"
            :disabled="!kanValja" :aria-pressed="valda.includes(i)"
            @click="emit('vaxla', i)"
          >
            <b class="ark__tid">{{ e.time }}</b>
            <span class="ark__text"><template v-for="(b, k) in bitar[i]" :key="k"><u v-if="b.klader" class="ark__klader">{{ b.text }}</u><template v-else>{{ b.text }}</template></template></span>
            <svg
              v-if="tidigare.includes(i)" class="ark__ring ark__ring--tidigare" :style="{ rotate: `${-LUT[i]}deg` }"
              aria-hidden="true"
            ><ellipse cx="50%" cy="50%" rx="48.5%" ry="44%" /></svg>
            <svg
              v-if="valda.includes(i)" class="ark__ring" :style="{ rotate: `${LUT[i]}deg` }"
              aria-hidden="true"
            ><ellipse class="pl-penna" cx="50%" cy="50%" rx="48.5%" ry="45%" pathLength="1" /></svg>
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.ark { flex: 1 1 auto; width: 100%; height: 100%; min-height: 0; container-type: inline-size; display: flex; }
.ark__papper {
  flex: 1; min-height: 0; display: flex; flex-direction: column; rotate: 0.4deg;
  padding: clamp(0.6rem, 2.4cqi, 1.3rem) clamp(0.6rem, 2.6cqi, 1.5rem);
  background-image: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 4px);
  font-size: clamp(0.78rem, 2cqi, 1.12rem);
}
.ark__huvud {
  flex: none; margin: 0 0 0.5em; padding-bottom: 0.4em; border-bottom: 1.5px solid rgba(0, 0, 0, 0.25);
  font-weight: 700; letter-spacing: 0.06em; font-size: 0.92em;
}
.ark__rader {
  flex: 1; min-height: 0; margin: 0; padding: 0.25em 0.4em; list-style: none; overflow-y: auto;
  display: flex; flex-direction: column; justify-content: space-between; gap: 0.15em;
}
.ark__li { list-style: none; }
.ark__rad {
  position: relative; width: 100%; display: grid; grid-template-columns: auto 1fr; gap: 0.7em; align-items: baseline;
  padding: 0.22em 0.5em; border: none; background: transparent; color: #1d1d1d; text-align: left;
  font: inherit; line-height: 1.25;
}
.ark__rad:disabled { cursor: default; opacity: 1; color: #1d1d1d; }
.ark__rad--val { cursor: pointer; border-radius: 6px; }
.ark__rad--val:active { background: rgba(208, 36, 27, 0.07); }
.ark__tid { font-weight: 700; }
.ark__text { min-width: 0; }
.ark__klader { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 0.18em; }
.ark__ring { position: absolute; inset: -0.3em -0.4em; width: calc(100% + 0.8em); height: calc(100% + 0.6em); overflow: visible; pointer-events: none; }
/* Procent-koordinater (ingen viewBox) → jämn linje utan skalning; pathLength=1 låter pennan ritas. */
.ark__ring .pl-penna { vector-effect: none; stroke-width: 3.5; }
.ark__ring--tidigare ellipse { fill: none; stroke: #d0241b; stroke-width: 1.6; opacity: 0.38; }
</style>
