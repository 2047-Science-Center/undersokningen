<script setup lang="ts">
/**
 * Den smala remsan längst ner — det ENDA som alltid syns (stegflödet ersätter rubrikraden + UPPDRAG):
 *   ✓ BROTTSPLATSEN  ● UTREDNINGSBORDET  ○ TAVLAN   SIDA B · FÄLTET   (andra sidan just nu)   5:12   TILL TAVLAN ▸
 * TILL TAVLAN = tidig gissning (Josef 2026-11-26: ja) — öppnar tavlan på båda skärmarna.
 */
import { computed } from 'vue'
import { useUndersokningenStore } from '../../store/undersokningenStore'

const props = withDefaults(
  defineProps<{
    sida: 'A' | 'B'
    roll: string
    /** Platserna i ordning (id + namn på remsan). Sista = tavlan. */
    platser: { id: string; namn: string }[]
    /** Aktuell plats (id). */
    aktiv: string
    /** Andra sidan just nu, t.ex. "Labbet: 4 av 6 prov". */
    annan?: string
    tavla?: boolean
  }>(),
  { annan: '', tavla: true },
)
const emit = defineEmits<{ tavlan: [] }>()
const store = useUndersokningenStore()

const aktivIx = computed(() => props.platser.findIndex((p) => p.id === props.aktiv))
const mmss = computed(() => {
  const s = store.secondsLeft
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
</script>

<template>
  <div class="pr">
    <div class="pr__platser">
      <span
        v-for="(p, i) in platser" :key="p.id" class="pr__plats"
        :class="{ 'pr__plats--klar': i < aktivIx, 'pr__plats--on': i === aktivIx }"
      >{{ i < aktivIx ? '✓' : i === aktivIx ? '●' : '○' }} {{ p.namn }}</span>
    </div>
    <span class="pr__sida">SIDA {{ sida }} · {{ roll }}</span>
    <span v-if="annan" class="pr__annan">{{ annan }}</span>
    <span class="pr__tid mono" :class="{ 'pr__tid--warn': store.timerWarn }">{{ mmss }}</span>
    <button v-if="tavla" type="button" class="pr__tavla" @click="emit('tavlan')">TILL TAVLAN ▸</button>
  </div>
</template>

<style scoped>
.pr {
  container-type: inline-size;
  flex: none; display: flex; align-items: center; gap: clamp(0.8rem, 1.6vw, 1.6rem); padding: 0.45rem 0.9rem;
  border-top: 2px solid var(--color-primary-dim); background: var(--color-background);
  font-family: var(--font-mono); font-size: clamp(0.85rem, 1.25vw, 1.1rem); color: var(--color-ink-muted); white-space: nowrap;
}
.pr__platser { display: flex; gap: clamp(0.6rem, 1.2vw, 1.2rem); overflow: hidden; }
.pr__plats--klar { color: var(--color-ink-strong); }
.pr__plats--on { color: var(--color-primary); font-weight: 600; }
.pr__sida { color: var(--color-ink-muted); }
.pr__annan { overflow: hidden; text-overflow: ellipsis; color: var(--color-ink-strong); }
.pr__tid { margin-left: auto; font-family: var(--font-retro); font-size: clamp(1.4rem, 2.4vw, 2rem); color: var(--color-ink-strong); }
.pr__tid--warn { color: var(--color-danger); animation: pr-puls 0.8s ease-in-out infinite; }
.pr__tavla {
  font-family: var(--font-mono); font-size: inherit; color: var(--color-primary); background: transparent;
  border: 2px solid var(--color-primary-dim); border-radius: 8px; padding: 0.2em 0.8em; cursor: pointer;
}
/* Halv bredd (delad vy, smal skärm): sidan står redan i platsens rubrik — ge plats åt den andra sidans rad. */
@container (max-width: 1100px) {
  .pr__sida { display: none; }
  .pr__annan { white-space: normal; line-height: 1.15; }
}
@keyframes pr-puls { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .pr__tid--warn { animation: none; } }
</style>
