<script setup lang="ts">
/**
 * FÄLT rollgenomgång — verktygsstegen EFTER referensfallet, körda i SAMMA vy
 * som spelet (avtrycksyta + IDENTIFIERAD-popup + logg + misstänkta-panel) med
 * scriptade mock-animationer: lys (lyspennan tänder avtryck) → skanna
 * (skanningstornet → IDENTIFIERAD) → markera (placera som misstänkt/icke
 * misstänkt) → slut. Demo-personer = samma mockups som referensfallet:
 * Dana (misstänkt) + Nils (icke misstänkt). Innehåll i config.FALT_TUT.
 */
import { ref, computed, watch } from 'vue'
import { FALT_TUT, LOG, REF_CASE } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Icon from '../components/Icon.vue'
import Placeholder from '../components/Placeholder.vue'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const SCENES = ['lys', 'skanna', 'markera', 'slut'] as const
type SceneId = (typeof SCENES)[number]
const ix = ref(0)
const scene = computed<SceneId>(() => SCENES[ix.value])
const isLast = computed(() => ix.value >= SCENES.length - 1)

const captions: Record<SceneId, string> = {
  lys: FALT_TUT.lys,
  skanna: FALT_TUT.skanna,
  markera: FALT_TUT.markera,
  slut: FALT_TUT.slut,
}
const caption = computed(() => captions[scene.value])

const dana = REF_CASE.dana
const nils = REF_CASE.nils

/** Scen skanna: visa först "SKANNAR…", sen poppar personbilden fram. */
const revealed = ref(false)
watch(
  scene,
  (s) => {
    revealed.value = false
    if (s === 'skanna') {
      window.setTimeout(() => {
        if (scene.value === 'skanna') revealed.value = true
      }, 1100)
    }
  },
  { immediate: true },
)
const scanning = computed(() => scene.value === 'skanna' && !revealed.value)
const showIdCard = computed(() => scene.value === 'skanna' && revealed.value)
const sorting = computed(() => scene.value === 'markera')
/** Panelen visar Dana när hon markerats (markera) och framåt (slut). */
const inSuspects = computed(() => scene.value === 'markera' || scene.value === 'slut')

/** Avtryck på ytan (demo-positioner). */
const SPOTS = [
  { x: 24, y: 30 }, { x: 62, y: 22 }, { x: 44, y: 54 },
  { x: 74, y: 60 }, { x: 30, y: 72 },
]
const SCAN_SPOT = 2

function next(): void {
  audio.play('blip')
  if (isLast.value) {
    emit('done')
    return
  }
  ix.value += 1
}
</script>

<template>
  <div class="frt">
    <p class="frt__case"><Icon name="scanner" :size="15" /> FÄLTKONSOL · GENOMGÅNG</p>

    <!-- Samma vy som spelet -->
    <div class="falt">
      <!-- Misstänkta-panel (topp) -->
      <section class="falt__suspects">
        <span class="falt__suspects-title"><Icon name="person" :size="14" /> MISSTÄNKTA</span>
        <div class="falt__suspects-row">
          <button v-if="inSuspects" class="falt__suspect pop-in">
            <Placeholder class="falt__suspect-img" :path="dana.image" :label="dana.name" />
          </button>
          <span v-else class="falt__suspects-empty">Markera misstänkta — de dyker upp här.</span>
        </div>
      </section>

      <div class="falt__body">
        <!-- Avtrycksyta -->
        <section class="falt__surface-wrap">
          <div class="falt__surface-head"><Icon name="finger" :size="15" /> FINGERAVTRYCK — SEKTOR C</div>
          <div class="falt__surface">
            <span
              v-for="(s, i) in SPOTS" :key="i" class="frt__spot"
              :class="{ 'frt__spot--lit': scene !== 'lys', 'frt__spot--scan': i === SCAN_SPOT && scene === 'skanna' }"
              :style="{ left: s.x + '%', top: s.y + '%', '--d': 0.12 * i + 's' }"
            >
              <Icon name="finger" :size="26" />
            </span>

            <!-- Lyspenna-svep (scen lys) -->
            <span v-if="scene === 'lys'" class="frt__sweep" aria-hidden="true" />
            <span v-if="scene === 'lys'" class="frt__pen" aria-hidden="true"><Icon name="uv" :size="40" /></span>

            <!-- Skanna: scannern läser avtrycket innan bilden poppar fram -->
            <div
              v-if="scanning" class="frt__scan" aria-hidden="true"
              :style="{ left: SPOTS[SCAN_SPOT].x + '%', top: SPOTS[SCAN_SPOT].y + '%' }"
            >
              <span class="frt__scan-ring" />
              <span class="frt__scan-label">SKANNAR…</span>
            </div>

            <!-- IDENTIFIERAD-popup (scen skanna) — samma kort som i spelet -->
            <Transition name="pop">
              <div v-if="showIdCard" class="falt__popup">
                <div class="falt__card amber-frame">
                  <Placeholder class="falt__photo" :path="dana.image" :label="dana.name" />
                  <div class="falt__id">
                    <span class="falt__id-eyebrow">IDENTIFIERAD SOM</span>
                    <span class="falt__id-name ink-strong">{{ dana.name }}</span>
                    <span class="falt__id-clothing">{{ dana.clothing }}</span>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Markera: placera Dana (misstänkt) + Nils (icke misstänkt) -->
            <Transition name="pop">
              <div v-if="sorting" class="falt__popup">
                <div class="frt__sorter">
                  <p class="frt__sort-q">{{ FALT_TUT.markera_q }}</p>
                  <div class="frt__sort-cards">
                    <div class="frt__sortcard amber-frame frt__sortcard--yes">
                      <Placeholder class="frt__sortcard-img" :path="dana.image" :label="dana.name" />
                      <span class="frt__sortcard-name ink-strong">{{ dana.name }}</span>
                      <span class="frt__tag frt__tag--yes"><Icon name="person" :size="15" /> Misstänkt<span class="frt__tap" aria-hidden="true" /></span>
                    </div>
                    <div class="frt__sortcard amber-frame">
                      <Placeholder class="frt__sortcard-img" :path="nils.image" :label="nils.name" />
                      <span class="frt__sortcard-name ink-strong">{{ nils.name }}</span>
                      <span class="frt__tag frt__tag--no">Icke misstänkt</span>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </section>

        <!-- Händelselogg -->
        <section class="falt__log amber-frame">
          <h3 class="falt__log-title"><Icon name="logg" :size="15" /> HÄNDELSELOGG</h3>
          <ul class="falt__log-list">
            <li v-for="(e, i) in LOG.entries" :key="i" class="falt__log-row">
              <span class="falt__log-time mono">{{ e.time }}</span>
              <span class="falt__log-text">{{ e.text }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- Markera: bilden flyger upp till MISSTÄNKTA-panelen -->
      <div v-if="sorting" class="frt__fly" aria-hidden="true">
        <Placeholder class="frt__fly-img" :path="dana.image" label="" />
      </div>
    </div>

    <p class="frt__caption">{{ caption }}</p>
    <div class="frt__dots">
      <span v-for="(s, i) in SCENES" :key="s" class="frt__dot" :class="{ 'frt__dot--on': i <= ix }" />
    </div>
    <button class="crt-button crt-button--strong frt__btn" @click="next">
      {{ isLast ? t('onboarding.go_live') : t('onboarding.next') }} ▸
    </button>
  </div>
</template>

<style scoped>
.frt { display: flex; flex-direction: column; align-items: center; gap: clamp(0.4rem, 1.2vh, 0.9rem); height: 100%; padding: clamp(0.6rem, 1.6vh, 1.1rem); text-align: center; }
.frt__case { margin: 0; font-family: var(--font-retro); font-size: clamp(0.85rem, 1.6vw, 1.05rem); letter-spacing: 0.08em; color: var(--color-primary); display: inline-flex; align-items: center; gap: 0.4rem; }

/* ===== Konsol-replika (samma vy som spelet) ===== */
.falt { position: relative; flex: 1 1 auto; width: min(99vw, 94rem); min-height: 0; display: flex; flex-direction: column; gap: 0.7rem; }
.falt__suspects { flex: none; display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem 0.6rem; background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 8px; min-height: 3.4rem; }
.falt__suspects-title { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--color-primary); white-space: nowrap; }
.falt__suspects-row { display: flex; gap: 0.5rem; }
.falt__suspect { width: 3.4rem; height: 2.6rem; padding: 0; border: 1px solid var(--color-primary); border-radius: 6px; overflow: hidden; background: #000; }
.falt__suspect-img { width: 100%; height: 100%; }
.falt__suspects-empty { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); opacity: 0.7; }

.falt__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1rem; }
.falt__surface-wrap { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
.falt__surface-head { display: flex; align-items: center; gap: 0.4rem; font-family: var(--font-retro); letter-spacing: 0.06em; color: var(--color-primary); }
.falt__surface {
  position: relative; flex: 1; min-height: 12rem; overflow: hidden;
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    var(--color-background-2);
}
.frt__spot { position: absolute; transform: translate(-50%, -50%); color: var(--color-ink-muted); opacity: 0; transition: opacity 0.4s var(--ease-out), color 0.3s; }
.frt__spot--lit { opacity: 1; color: var(--color-primary); }
.frt__spot:not(.frt__spot--lit) { animation: spotlight 0.5s var(--ease-out) forwards; animation-delay: var(--d); }
@keyframes spotlight { to { opacity: 0.9; color: var(--color-primary); } }
.frt__spot--scan { animation: scanpulse 1.4s ease-in-out infinite; }
@keyframes scanpulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.35); color: var(--color-ink-strong); } }
.frt__sweep { position: absolute; top: 0; bottom: 0; width: 28%; left: -28%; background: linear-gradient(90deg, transparent, rgba(var(--mode-accent-rgb), 0.28), transparent); animation: sweep 2.4s ease-in-out infinite; }
@keyframes sweep { 0% { left: -28%; } 100% { left: 100%; } }
.frt__pen { position: absolute; top: 0.4rem; right: 0.6rem; color: var(--color-primary); opacity: 0.8; }

/* Popup (samma kort som i spelet) */
.falt__popup { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; background: rgba(3, 9, 6, 0.92); padding: 0.6rem; }
.falt__card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(0.5rem, 1.6vh, 1rem); padding: clamp(0.8rem, 2vh, 1.4rem); width: 100%; height: 100%; background: var(--color-background-2); overflow: hidden; }
.falt__photo { width: 100%; max-width: 100%; max-height: 62%; align-self: center; }
.falt__id { display: flex; flex-direction: column; gap: 0.35rem; align-items: center; text-align: center; }
.falt__id-eyebrow { font-family: var(--font-mono); font-size: clamp(0.8rem, 1.5vw, 1rem); letter-spacing: 0.14em; color: var(--color-primary); }
.falt__id-name { font-size: clamp(1.8rem, 4vw, 2.8rem); line-height: 1.05; }
.falt__id-clothing { font-family: var(--font-mono); font-size: clamp(1rem, 2vw, 1.3rem); color: var(--color-ink-muted); }

/* Markera-sorter (Dana misstänkt / Nils icke misstänkt) */
.frt__sorter { display: flex; flex-direction: column; align-items: center; gap: clamp(0.6rem, 2vh, 1.2rem); width: 100%; height: 100%; justify-content: center; padding: 0.6rem; }
.frt__sort-q { margin: 0; font-family: var(--font-retro); font-size: clamp(1.2rem, 2.8vw, 1.9rem); color: var(--color-ink-strong); text-shadow: var(--glow-soft); }
.frt__sort-cards { display: flex; gap: clamp(0.8rem, 3vw, 2rem); }
.frt__sortcard { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.7rem; background: var(--color-background-2); max-width: 15rem; }
.frt__sortcard--yes { border-color: var(--color-primary); box-shadow: var(--glow-soft); }
.frt__sortcard-img { width: clamp(8rem, 18vh, 12rem); }
.frt__sortcard-name { font-size: clamp(1.1rem, 2.4vw, 1.5rem); }
.frt__tag { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: clamp(0.85rem, 1.8vw, 1.1rem); letter-spacing: 0.04em; padding: 0.25em 0.8em; border-radius: 999px; position: relative; }
.frt__tag--yes { color: var(--color-ink-strong); border: 1px solid var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.15); }
.frt__tag--no { color: var(--color-ink-muted); border: 1px solid var(--color-primary-dim); }
.frt__tap { position: absolute; right: -10px; bottom: -10px; width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.85); box-shadow: 0 0 0 7px rgba(var(--mode-accent-rgb), 0.3); animation: tap 1.6s ease-in-out infinite; }
@keyframes tap { 0%, 55%, 100% { transform: scale(1); } 72% { transform: scale(0.65); } }

/* Logg */
.falt__log { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.8rem; min-height: 0; overflow: hidden; background: var(--color-background-2); }
.falt__log-title { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-size: 1rem; letter-spacing: 0.06em; color: var(--color-primary); }
.falt__log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; }
.falt__log-row { display: grid; grid-template-columns: 3.4em 1fr; gap: 0.6rem; }
.falt__log-time { color: var(--color-primary); }
.falt__log-text { font-family: var(--font-mono); font-size: 0.84rem; line-height: 1.35; }

.pop-in { animation: pop-in 0.3s var(--ease-out); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: none; } }
.pop-enter-active { transition: opacity 180ms var(--ease-out); }
.pop-enter-from { opacity: 0; }

/* Navigering */
.frt__caption { margin: 0; font-family: var(--font-mono); font-size: clamp(1.1rem, 2.2vw, 1.55rem); line-height: 1.35; color: var(--color-ink-strong); max-width: 54ch; min-height: 2.4em; }
.frt__dots { display: flex; gap: 0.5rem; }
.frt__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.frt__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.frt__btn { font-size: clamp(1.05rem, 2vw, 1.35rem); padding: 0.6em 1.5em; }

/* Skanna-indikator (scen skanna, före bilden poppar) */
.frt__scan { position: absolute; transform: translate(-50%, -50%); z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; pointer-events: none; }
.frt__scan-ring { width: clamp(2.6rem, 5vw, 3.8rem); height: clamp(2.6rem, 5vw, 3.8rem); border: 2px solid var(--color-primary); border-radius: 50%; animation: scanring 1.1s ease-out infinite; }
@keyframes scanring { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
.frt__scan-label { font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.12em; color: var(--color-primary); background: rgba(2, 6, 4, 0.72); padding: 0.1em 0.55em; border-radius: 5px; white-space: nowrap; }

/* Markera: bilden flyger upp till MISSTÄNKTA-panelen */
.frt__fly { position: absolute; z-index: 20; width: clamp(2.6rem, 5vw, 3.6rem); height: clamp(2rem, 4vw, 2.8rem); border: 1px solid var(--color-primary); border-radius: 6px; overflow: hidden; box-shadow: var(--glow-strong); pointer-events: none; left: 20%; top: 52%; animation: flyup 2.8s ease-in-out infinite; }
.frt__fly-img { width: 100%; height: 100%; }
@keyframes flyup {
  0%, 30% { left: 20%; top: 52%; opacity: 0; transform: scale(0.85); }
  42% { opacity: 1; transform: scale(1); }
  78% { left: 9%; top: 6%; opacity: 1; transform: scale(0.65); }
  88%, 100% { left: 9%; top: 6%; opacity: 0; transform: scale(0.55); }
}

@media (prefers-reduced-motion: reduce) {
  .frt__spot:not(.frt__spot--lit) { animation: none; opacity: 0.9; color: var(--color-primary); }
  .frt__spot--scan, .frt__sweep, .frt__tap, .frt__scan-ring, .frt__fly { animation: none; }
  .frt__fly { opacity: 0; }
}
</style>
