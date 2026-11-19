<script setup lang="ts">
/**
 * Tutorial: VALdi-introt (inläst, textat, rullar själv: läges-legenden → 3D-filmen över
 * fallet) → rollgenomgång per sida (klickas igenom, utan röst) → sync-barriär → go-live.
 */
import { ref, computed, watch } from 'vue'
import { type ValvId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { OTHER } from '../engine/gameEngine'
import { useUndersokningenStore } from '../store/undersokningenStore'
import BarrierWait from './BarrierWait.vue'
import IntroVo from './introvo/IntroVo.vue'
import LabbRoleTutorial from './LabbRoleTutorial.vue'
import FaltRoleTutorial from './FaltRoleTutorial.vue'

const props = defineProps<{ team: ValvId; shared?: boolean }>()
const store = useUndersokningenStore()
const { t } = useI18n()

const me = computed(() => props.team)
const other = computed(() => OTHER[props.team])
const leader = computed(() => props.shared || me.value === 'lag1')
/** FÄLT: referensfall → gate. LABB: referensfall → rollgenomgång → gate. */
const isFalt = computed(() => props.team === 'lag2')

const phase = ref<'intro' | 'role' | 'gate'>('intro')
const iAmReady = ref(false)

const bothReady = computed(() => store.onbReady[me.value] && (props.shared || store.onbReady[other.value]))

function markReady(): void {
  iAmReady.value = true
  store.onbMarkReady(me.value)
}

watch([bothReady], () => {
  if (leader.value && bothReady.value) store.onbGoto('live')
})
</script>

<template>
  <div class="tut">
    <!-- VALdi-introt: läges-legenden + 3D-filmen, inläst och textat, i takt på båda skärmarna.
         Ersätter legend-rutan och filmens textrutor (FaltRefTutorial finns kvar oanvänt). -->
    <IntroVo v-if="phase === 'intro'" class="tut__vo" @done="phase = 'role'" />

    <!-- Rollgenomgång (egna verktygen) i samma vy som spelet, efter referensfallet -->
    <template v-else-if="phase === 'role'">
      <FaltRoleTutorial v-if="isFalt" @done="phase = 'gate'" />
      <LabbRoleTutorial v-else @done="phase = 'gate'" />
    </template>

    <!-- Barriär / go-live -->
    <template v-else>
      <template v-if="!iAmReady">
        <p class="tut__ready-q">{{ t('mode.golive_title') }}</p>
        <button class="crt-button crt-button--strong" @click="markReady">{{ t('onb.ready') }}</button>
      </template>
      <BarrierWait v-else />
    </template>
  </div>
</template>

<style scoped>
.tut { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(1rem, 2.5vh, 1.6rem); height: 100%; text-align: center; padding: clamp(1rem, 3vh, 2rem); }
.tut__vo { flex: 1 1 auto; align-self: stretch; margin: calc(-1 * clamp(1rem, 3vh, 2rem)); }
.tut__case { margin: 0; font-family: var(--font-retro); font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: 0.08em; color: var(--color-primary); }
/* Rutan fyller nästan hela skärmen så texten blir riktigt läsbar. */
.tut__beat { width: min(94vw, 72rem); flex: 1 1 auto; max-height: 76vh; padding: clamp(1.4rem, 4vh, 3rem) clamp(1.4rem, 4vw, 3rem); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(1rem, 2.6vh, 1.8rem); background: var(--color-background-2); }
.tut__visual { display: flex; align-items: center; justify-content: center; }
.tut__visual-img { width: clamp(16rem, 32vh, 28rem); max-width: 70vw; }
.tut__visual-icon {
  width: clamp(120px, 15vh, 160px); height: clamp(120px, 15vh, 160px); display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-primary-dim); border-radius: 50%; color: var(--color-primary);
  box-shadow: var(--glow-soft); background: var(--color-background);
}
.tut__beat-label { display: inline-flex; align-items: center; gap: 0.45rem; font-family: var(--font-mono); font-size: clamp(0.85rem, 1.6vw, 1.05rem); letter-spacing: 0.14em; color: var(--color-primary); }
.tut__beat-text { margin: 0; font-size: clamp(1.5rem, 3vw, 2.3rem); line-height: 1.4; max-width: 32ch; color: var(--color-ink-strong); }
.tut .crt-button { font-size: clamp(1.05rem, 2vw, 1.4rem); padding: 0.75em 1.6em; }
/* Mjuk övergång mellan beats (ease-out + lätt blur maskerar bytet). */
.beat-enter-active, .beat-leave-active { transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), filter 200ms var(--ease-out); }
.beat-enter-from { opacity: 0; transform: translateY(10px) scale(0.98); filter: blur(2px); }
.beat-leave-to { opacity: 0; transform: translateY(-8px); filter: blur(2px); }
@media (prefers-reduced-motion: reduce) {
  .beat-enter-active, .beat-leave-active { transition: opacity 180ms ease; }
  .beat-enter-from, .beat-leave-to { transform: none; filter: none; }
}
.tut__dots { display: flex; gap: 0.5rem; }
.tut__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.tut__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.tut__ready-q { margin: 0; font-size: clamp(2rem, 4vw, 2.8rem); letter-spacing: 0.06em; color: var(--color-primary); }
</style>
