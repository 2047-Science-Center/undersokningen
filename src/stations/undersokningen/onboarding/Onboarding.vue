<script setup lang="ts">
/**
 * Tutorial — "ett löst fall" (referensfall 2-911). Läges-legend → genomgång i
 * text-beats (avtryck → logg → hår → slutsats) som visar att alla tre bitarna
 * behövs → sync-barriär → go-live. Röst läggs på senare.
 */
import { ref, computed, watch } from 'vue'
import { REF_CASE, type ValvId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import ModeLegend from '@/station-kit/components/ModeLegend.vue'
import { OTHER } from '../engine/gameEngine'
import { useUndersokningenStore } from '../store/undersokningenStore'
import BarrierWait from './BarrierWait.vue'

const props = defineProps<{ team: ValvId; shared?: boolean }>()
const store = useUndersokningenStore()
const { t } = useI18n()

const me = computed(() => props.team)
const other = computed(() => OTHER[props.team])
const leader = computed(() => props.shared || me.value === 'lag1')

const phase = ref<'legend' | 'beats' | 'gate'>('legend')
const beatIx = ref(0)
const iAmReady = ref(false)

const beat = computed(() => REF_CASE.beats[beatIx.value])
const isLastBeat = computed(() => beatIx.value >= REF_CASE.beats.length - 1)
const beatLabel = computed(() => t('tut.beat_' + beat.value.kind))

const bothReady = computed(() => store.onbReady[me.value] && (props.shared || store.onbReady[other.value]))

function next(): void {
  audio.play('blip')
  if (phase.value === 'legend') phase.value = 'beats'
  else if (phase.value === 'beats') {
    if (isLastBeat.value) phase.value = 'gate'
    else beatIx.value += 1
  }
}
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
    <!-- Läges-legend -->
    <template v-if="phase === 'legend'">
      <ModeLegend />
      <p class="tut__intro">{{ REF_CASE.intro }}</p>
      <button class="crt-button crt-button--strong" @click="next">{{ t('onboarding.next') }} ▸</button>
    </template>

    <!-- Referensfall-beats -->
    <template v-else-if="phase === 'beats'">
      <p class="tut__case">{{ REF_CASE.title }}</p>
      <div class="tut__beat amber-frame">
        <span class="tut__beat-label">{{ beatLabel }}</span>
        <p class="tut__beat-text">{{ beat.text }}</p>
      </div>
      <div class="tut__dots">
        <span v-for="i in REF_CASE.beats.length" :key="i" class="tut__dot" :class="{ 'tut__dot--on': i - 1 <= beatIx }" />
      </div>
      <button class="crt-button crt-button--strong" @click="next">
        {{ isLastBeat ? t('onboarding.go_live') : t('onboarding.next') }} ▸
      </button>
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
.tut { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; height: 100%; text-align: center; padding: 2rem; }
.tut__intro { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); max-width: 44ch; }
.tut__case { margin: 0; font-family: var(--font-retro); letter-spacing: 0.08em; color: var(--color-primary); }
.tut__beat { max-width: 52ch; padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.6rem; background: var(--color-background-2); }
.tut__beat-label { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.12em; color: var(--color-primary); }
.tut__beat-text { margin: 0; font-size: 1.2rem; line-height: 1.4; color: var(--color-ink-strong); }
.tut__dots { display: flex; gap: 0.5rem; }
.tut__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.tut__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.tut__ready-q { margin: 0; font-size: 1.6rem; letter-spacing: 0.06em; color: var(--color-primary); }
</style>
