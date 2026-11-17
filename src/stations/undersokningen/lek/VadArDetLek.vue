<script setup lang="ts">
/**
 * "Vad är det?" — Undersökningens lek (lila). Logik: vadArDet.ts.
 *   LABB (lag1): mikroskopet live → skanna något hemligt → FRYS → alla gissar → VISA SVARET.
 *   FÄLT (lag2): instruktion "alla till mikroskopet" + den frysta bilden stort.
 * Delad vy (pilot): båda sida vid sida. Synk: station-kit/lek (ledaren = lag1/delad).
 * Avmontering (ny grupp/byte) stänger kameran och släpper bilden (bara RAM).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import LekPanel from '@/station-kit/lek/LekPanel.vue'
import { createLekSync, type LekTransport } from '@/station-kit/lek/lekSync'
import { audio } from '@/station-kit/audio/AudioEngine'
import Microscope from '../components/Microscope.vue'
import { GISSA_MS, TIPS, initialVad, reduceVad, shrinkImage, type VadState } from './vadArDet'

const props = defineProps<{
  /** Vilken skärm: labb (mikroskopet), falt, eller shared (båda). */
  role: 'labb' | 'falt' | 'shared'
  leader: boolean
  transport?: LekTransport | null
}>()

const sync = createLekSync<VadState>({
  channel: 'vadardet',
  initial: initialVad(Date.now()),
  reduce: (s, a, now) => reduceVad(s, a, now),
  leader: props.leader,
  transport: props.transport,
})
const s = sync.state
const scope = ref<InstanceType<typeof Microscope> | null>(null)

const showLabb = computed(() => props.role !== 'falt')
const showFalt = computed(() => props.role !== 'labb')

const now = ref(Date.now())
const leftSec = computed(() => Math.max(0, Math.ceil((GISSA_MS - (now.value - s.phaseAt)) / 1000)))
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 250)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  sync.dispose()
})

async function onCapture(data: string): Promise<void> {
  if (s.phase !== 'skanna') return
  sync.act({ type: 'frys', image: await shrinkImage(data) })
}

// Tillbaka till skanna (från vilken skärm som helst) → mikroskopet live igen.
watch(
  () => s.phase,
  (p, old) => {
    if (p === 'skanna') scope.value?.release()
    if (p === 'gissa') audio.play('popup')
    if (p === 'facit') audio.play('confirm')
    if (old === 'facit' && p === 'skanna') audio.play('blip')
  },
)

const labbHint = computed(() =>
  s.phase === 'skanna'
    ? 'Skanna något hemligt — tryck FRYS.'
    : s.phase === 'gissa'
      ? 'De andra gissar! Säg inget.'
      : 'Visa vad det var!',
)
const faltHint = computed(() =>
  s.phase === 'skanna' ? 'Alla till mikroskopet!' : s.phase === 'gissa' ? 'Vad är det? Gissa högt!' : 'Vad var det?',
)
const score = computed(() => (s.rundor ? `${s.ratt} av ${s.rundor} rätt gissade` : ''))
</script>

<template>
  <div class="vad" :class="{ 'vad--split': role === 'shared' }">
    <!-- LABB -->
    <LekPanel v-if="showLabb" title="VAD ÄR DET?" :hint="labbHint">
      <div class="vad__labb">
        <div class="vad__scope">
          <Microscope ref="scope" @capture="onCapture" />
        </div>
        <aside class="vad__side">
          <p class="vad__turn">Person {{ s.turn }}</p>
          <template v-if="s.phase === 'skanna'">
            <p class="vad__txt">Lägg något under mikroskopet utan att de andra ser vad. Tryck <b>FRYS</b>.</p>
            <p class="vad__tips">Tips: {{ TIPS.join(' · ') }}</p>
            <p class="vad__warn">Rikta aldrig mikroskopet mot ögat.</p>
          </template>
          <template v-else-if="s.phase === 'gissa'">
            <p class="vad__clock">{{ leftSec }} s</p>
            <button class="lek-btn lek-btn--big" @click="sync.act({ type: 'facit' })">Visa svaret ▸</button>
          </template>
          <template v-else>
            <p class="vad__txt">Lyft fram saken och visa! Gissade någon rätt?</p>
            <div class="vad__row">
              <button class="lek-btn" @click="sync.act({ type: 'nasta', ratt: true })">Ja ✓</button>
              <button class="lek-btn" @click="sync.act({ type: 'nasta', ratt: false })">Nej ✗</button>
            </div>
          </template>
        </aside>
      </div>
      <template #foot>
        <span>{{ score }}</span>
        <span>Nästa person tar över efter varje runda.</span>
      </template>
    </LekPanel>

    <!-- FÄLT -->
    <LekPanel v-if="showFalt" title="VAD ÄR DET?" :hint="faltHint">
      <div v-if="s.phase === 'skanna'" class="vad__falt-wait">
        <p class="vad__big">🔬</p>
        <p class="vad__txt">En i taget skannar något hemligt i mikroskopet på labbsidan.<br />Ni andra gissar vad det är — bilden dyker upp här.</p>
        <p class="vad__txt vad__txt--dim">Sedan byter ni. Alla får skanna!</p>
      </div>
      <div v-else class="vad__shot">
        <img v-if="s.image" :src="s.image" alt="Fryst mikroskopbild" />
        <p v-if="s.phase === 'gissa'" class="vad__clock vad__clock--over">{{ leftSec }} s</p>
      </div>
      <template #foot><span>{{ score }}</span></template>
    </LekPanel>
  </div>
</template>

<style scoped>
.vad {
  height: 100%;
  min-height: 0;
  display: grid;
  gap: 1rem;
}
.vad--split {
  grid-template-columns: 1.4fr 1fr;
}
.vad__labb {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr minmax(14rem, 22rem);
  gap: 1rem;
}
.vad__scope {
  min-height: 0;
  display: flex;
}
.vad__scope > * {
  flex: 1;
  min-width: 0;
}
.vad__side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}
.vad__turn {
  margin: 0;
  font-family: var(--font-retro, monospace);
  font-size: 1.8rem;
  color: #b48cff;
}
.vad__txt {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.35;
}
.vad__txt--dim {
  color: var(--color-ink-muted, #b9a8d8);
}
.vad__tips {
  margin: 0;
  font-size: 1rem;
  color: var(--color-ink-muted, #b9a8d8);
}
.vad__warn {
  margin: 0;
  font-size: 1rem;
  color: #ffb3a7;
}
.vad__row {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.vad__clock {
  margin: 0;
  font-family: var(--font-retro, monospace);
  font-size: 3.4rem;
  color: #b48cff;
}
.vad__falt-wait {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
.vad__big {
  margin: 0;
  font-size: 5rem;
}
.vad__shot {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vad__shot img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 2px solid #b48cff;
  border-radius: 12px;
}
.vad__clock--over {
  position: absolute;
  right: 1rem;
  bottom: 0.5rem;
  text-shadow: 0 0 12px #000;
}
</style>
