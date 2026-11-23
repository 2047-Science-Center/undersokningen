<script setup lang="ts">
/**
 * Animerad referens-tutorial för FÄLT-sidan — spelas upp i SAMMA visuella UI
 * som det skarpa spelet (avtrycksyta + IDENTIFIERAD-popup + händelselogg), men
 * scriptat och med rödpenne-markeringar + pil som visar tre-ströms-logiken:
 * avtryck → VEM, logg → NÄR, hår → AVGÖR. Ersätter de gamla textkorten.
 *
 * Innehåll bor i config.REF_CASE. Bilder via Placeholder (saknas → tydlig ruta).
 */
import { ref, computed } from 'vue'
import { REF_CASE } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Icon from '../components/Icon.vue'
import Placeholder from '../components/Placeholder.vue'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const SCENES = ['avtryck', 'logg', 'har', 'slutsats'] as const
type SceneId = (typeof SCENES)[number]

const ix = ref(0)
const scene = computed<SceneId>(() => SCENES[ix.value])
const isLast = computed(() => ix.value >= SCENES.length - 1)
const caption = computed(() => REF_CASE.scenes[scene.value])

/** Tillbaka ett steg (Josef 2026-11-23: bläddra fram och tillbaka i genomgången). */
function back(): void {
  if (ix.value > 0) ix.value -= 1
}
function next(): void {
  audio.play('blip')
  if (isLast.value) {
    emit('done')
    return
  }
  ix.value += 1
}

const dana = REF_CASE.dana
const nils = REF_CASE.nils
</script>

<template>
  <div class="rt">
    <p class="rt__case"><Icon name="logg" :size="15" /> {{ REF_CASE.title }} · ÖVNINGSFALL</p>

    <div class="rt__stage">
      <Transition name="scene" mode="out-in">
        <!-- ============ SCEN 1 — AVTRYCK ============ -->
        <div v-if="scene === 'avtryck'" key="avtryck" class="rt__scene rt__scene--avtryck">
          <!-- Avtrycksyta (som i skarpt läge) -->
          <div class="rt__surface amber-frame">
            <span class="rt__surface-head"><Icon name="finger" :size="14" /> FINGERAVTRYCK — SEKTOR C</span>
            <button class="rt__spot rt__spot--done" style="left: 26%; top: 38%"><Icon name="finger" :size="26" /></button>
            <button class="rt__spot" style="left: 64%; top: 60%"><Icon name="finger" :size="26" /></button>
            <!-- röd penna runt det återkommande avtrycket -->
            <svg class="rt__pen rt__pen--spot" viewBox="0 0 120 90" style="--d: 1.3s">
              <ellipse class="pen" cx="60" cy="45" rx="48" ry="32" transform="rotate(-8 60 45)" />
            </svg>
          </div>

          <!-- IDENTIFIERAD-popup (samma kort som i spelet) -->
          <div class="rt__card amber-frame fade-up" style="--d: 0.5s">
            <Placeholder class="rt__photo" :path="dana.image" :label="dana.name" />
            <span class="rt__eyebrow">IDENTIFIERAD SOM</span>
            <span class="rt__name ink-strong">{{ dana.name }}</span>
            <span class="rt__clothing">{{ dana.clothing }}</span>
            <span class="rt__prints mono fade-up" style="--d: 1.1s"><Icon name="finger" :size="20" /> 2 avtryck</span>
          </div>
        </div>

        <!-- ============ SCEN 2 — LOGG ============ -->
        <div v-else-if="scene === 'logg'" key="logg" class="rt__scene rt__scene--logg">
          <!-- Dana (kompakt) -->
          <div class="rt__card rt__card--slim amber-frame fade-up" style="--d: 0.2s">
            <Placeholder class="rt__photo rt__photo--slim" :path="dana.image" :label="dana.name" />
            <span class="rt__name ink-strong">{{ dana.name }}</span>
            <span class="rt__clothing rt__clothing--mark">
              {{ dana.clothing }}
              <svg class="rt__pen rt__pen--inline" viewBox="0 0 160 46" style="--d: 1.6s">
                <ellipse class="pen" cx="80" cy="23" rx="72" ry="18" transform="rotate(-3 80 23)" />
              </svg>
            </span>
          </div>

          <!-- Händelselogg -->
          <div class="rt__log amber-frame fade-up" style="--d: 0.4s">
            <span class="rt__log-title"><Icon name="logg" :size="15" /> HÄNDELSELOGG</span>
            <ul class="rt__log-list">
              <li
                v-for="(e, i) in REF_CASE.log" :key="i" class="rt__log-row"
                :class="{ 'rt__log-row--hit': e.circle }"
              >
                <span class="rt__log-time mono">{{ e.time }}</span>
                <span class="rt__log-text">{{ e.text }}</span>
                <svg v-if="e.circle" class="rt__pen rt__pen--row" viewBox="0 0 520 60" preserveAspectRatio="none" style="--d: 0.9s">
                  <ellipse class="pen" cx="260" cy="30" rx="250" ry="24" transform="rotate(-1 260 30)" />
                </svg>
              </li>
            </ul>
          </div>
        </div>

        <!-- ============ SCEN 3 — HÅR ============ -->
        <div v-else-if="scene === 'har'" key="har" class="rt__scene rt__scene--har">
          <div class="rt__suspects">
            <div class="rt__card rt__card--slim amber-frame fade-up" style="--d: 0.2s">
              <div class="rt__photo-wrap">
                <Placeholder class="rt__photo rt__photo--slim" :path="dana.image" :label="dana.name" />
                <svg class="rt__pen rt__pen--hair" viewBox="0 0 120 80" style="--d: 1s; --hx: 35%; --hy: 41%; --hw: 44%; --hh: 28%">
                  <ellipse class="pen" cx="60" cy="40" rx="40" ry="24" transform="rotate(-6 60 40)" />
                </svg>
                <span class="rt__hair-tag" style="--d: 1.3s">hår</span>
              </div>
              <span class="rt__name ink-strong">{{ dana.name }}</span>
              <span class="rt__clothing">{{ dana.hair }}</span>
            </div>

            <div class="rt__card rt__card--slim amber-frame fade-up" style="--d: 0.45s">
              <div class="rt__photo-wrap">
                <Placeholder class="rt__photo rt__photo--slim" :path="nils.image" :label="nils.name" />
                <svg class="rt__pen rt__pen--hair" viewBox="0 0 120 80" style="--d: 1.2s; --hx: 42%; --hy: 45%; --hw: 46%; --hh: 30%">
                  <ellipse class="pen" cx="60" cy="40" rx="40" ry="24" transform="rotate(5 60 40)" />
                </svg>
                <span class="rt__hair-tag" style="--d: 1.5s">hår</span>
              </div>
              <span class="rt__name ink-strong">{{ nils.name }}</span>
              <span class="rt__clothing">{{ nils.hair }}</span>
            </div>
          </div>

          <!-- pil Dana → mikroskopbild -->
          <svg class="rt__arrow" viewBox="0 0 120 60" style="--d: 1.9s" aria-hidden="true">
            <defs>
              <marker id="rt-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0 0 L8 4 L0 8 z" fill="var(--color-danger)" />
              </marker>
            </defs>
            <path class="pen pen--arrow" d="M8 30 C 45 10, 75 10, 110 28" marker-end="url(#rt-arrowhead)" />
          </svg>

          <!-- Mikroskop-mockup -->
          <div class="rt__scope amber-frame fade-up" style="--d: 0.7s">
            <span class="rt__scope-head"><Icon name="mikroskop" :size="15" /> MIKROSKOP</span>
            <Placeholder class="rt__scope-img" :path="REF_CASE.hairImage" :label="REF_CASE.hairLabel" />
            <span class="rt__scope-label">{{ REF_CASE.hairLabel }}</span>
          </div>
        </div>

        <!-- ============ SCEN 4 — SLUTSATS ============ -->
        <div v-else key="slutsats" class="rt__scene rt__scene--slutsats">
          <div class="rt__card amber-frame fade-up" style="--d: 0.2s">
            <Placeholder class="rt__photo" :path="dana.image" :label="dana.name" />
            <span class="rt__eyebrow">TJUVEN VAR</span>
            <span class="rt__name rt__name--big ink-strong">{{ dana.name }}</span>
          </div>
          <div class="rt__chain fade-up" style="--d: 0.6s">
            <span><Icon name="finger" :size="18" /> avtryck = VEM</span>
            <span><Icon name="logg" :size="18" /> logg = NÄR</span>
            <span><Icon name="mikroskop" :size="18" /> hår = AVGÖR</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Bildtext + navigering -->
    <p class="rt__caption">{{ caption }}</p>
    <div class="rt__dots">
      <span v-for="(s, i) in SCENES" :key="s" class="rt__dot" :class="{ 'rt__dot--on': i <= ix }" />
    </div>
    <div class="rt__nav">
      <button v-if="ix > 0" class="crt-button rt__btn rt__btn--back" @click="back">◂ {{ t('onboarding.back') }}</button>
      <button class="crt-button crt-button--strong rt__btn" @click="next">
        {{ isLast ? t('onboarding.go_live') : t('onboarding.next') }} ▸
      </button>
    </div>
  </div>
</template>

<style scoped>
.rt__nav { display: flex; gap: 0.8rem; justify-content: center; align-items: center; flex-wrap: wrap; }
.rt__btn--back { opacity: 0.85; }
.rt { display: flex; flex-direction: column; align-items: center; gap: clamp(0.6rem, 1.8vh, 1.2rem); height: 100%; padding: clamp(0.8rem, 2vh, 1.4rem); text-align: center; }
.rt__case { margin: 0; font-family: var(--font-retro); font-size: clamp(0.9rem, 1.8vw, 1.15rem); letter-spacing: 0.08em; color: var(--color-primary); display: inline-flex; align-items: center; gap: 0.4rem; }
.rt__stage { flex: 1 1 auto; width: min(99vw, 100rem); min-height: 0; display: flex; align-items: center; justify-content: center; }
.rt__scene { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: clamp(1.4rem, 4vw, 3.5rem); }

/* --- Avtrycksyta --- */
.rt__scene--avtryck { gap: clamp(1rem, 3vw, 2.4rem); }
.rt__surface {
  position: relative; flex: 1 1 0; max-width: 46rem; align-self: stretch; min-height: 22rem;
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.05) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.05) 38px 39px),
    var(--color-background-2);
}
.rt__surface-head { position: absolute; top: 0.5rem; left: 0.6rem; display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: 0.78rem; letter-spacing: 0.06em; color: var(--color-primary); }
.rt__spot { position: absolute; transform: translate(-50%, -50%); background: transparent; border: none; color: var(--color-primary); padding: 0.3rem; }
.rt__spot--done { color: var(--color-primary-dim); opacity: 0.45; }

/* --- ID-kort (samma som popupen i spelet) --- */
.rt__card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; padding: clamp(1.1rem, 2.6vh, 1.9rem); background: var(--color-background-2); flex: 0 0 auto; max-width: 32rem; }
.rt__card--slim { gap: 0.45rem; padding: 0.9rem; max-width: 24rem; }
.rt__photo { width: clamp(17rem, 40vh, 32rem); max-width: 64vw; }
.rt__photo--slim { width: clamp(13rem, 30vh, 22rem); }
.rt__photo-wrap { position: relative; display: inline-flex; }
.rt__eyebrow { font-family: var(--font-mono); font-size: clamp(0.95rem, 1.8vw, 1.2rem); letter-spacing: 0.14em; color: var(--color-primary); }
.rt__name { font-size: clamp(2.2rem, 5vw, 3.6rem); line-height: 1.05; }
.rt__name--big { font-size: clamp(3rem, 7vw, 4.8rem); }
.rt__clothing { font-family: var(--font-mono); font-size: clamp(1.15rem, 2.4vw, 1.6rem); color: var(--color-ink-muted); position: relative; }
.rt__clothing--mark { color: var(--color-ink-strong); display: inline-block; }
.rt__prints { display: inline-flex; align-items: center; gap: 0.4rem; font-size: clamp(1rem, 2vw, 1.3rem); color: var(--color-primary); }

/* --- Logg --- */
.rt__scene--logg { align-items: stretch; }
.rt__log { flex: 1 1 0; max-width: 52rem; display: flex; flex-direction: column; gap: 0.7rem; padding: 1.2rem 1.4rem; text-align: left; background: var(--color-background-2); }
.rt__log-title { display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--font-retro); font-size: clamp(1rem, 2vw, 1.3rem); letter-spacing: 0.06em; color: var(--color-primary); }
.rt__log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
.rt__log-row { position: relative; display: grid; grid-template-columns: 4em 1fr; gap: 0.8rem; }
.rt__log-time { color: var(--color-primary); font-size: clamp(0.95rem, 1.8vw, 1.2rem); }
.rt__log-text { font-family: var(--font-mono); font-size: clamp(0.95rem, 1.8vw, 1.2rem); line-height: 1.4; }
.rt__log-row--hit .rt__log-text { color: var(--color-ink-strong); }

/* --- Hår-scen --- */
.rt__scene--har { gap: clamp(0.6rem, 2vw, 1.4rem); }
.rt__suspects { display: flex; gap: clamp(0.6rem, 2vw, 1.2rem); }
.rt__hair-tag { position: absolute; top: -0.4rem; right: -0.4rem; font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; color: var(--color-danger); background: var(--color-background); border: 1px solid var(--color-danger); border-radius: 5px; padding: 0.05em 0.4em; opacity: 0; animation: tag-in 0.3s var(--ease-out) forwards; animation-delay: var(--d, 1s); }
.rt__arrow { width: clamp(4rem, 9vw, 7rem); height: auto; flex: 0 0 auto; align-self: center; overflow: visible; }
.rt__scope { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.9rem; max-width: 26rem; background: var(--color-background-2); }
.rt__scope-head { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: clamp(0.82rem, 1.6vw, 1.05rem); letter-spacing: 0.06em; color: var(--color-primary); }
.rt__scope-img { width: clamp(14rem, 30vh, 22rem); }
.rt__scope-label { font-family: var(--font-mono); font-size: clamp(0.9rem, 1.8vw, 1.15rem); color: var(--color-ink-strong); }

/* --- Slutsats --- */
.rt__scene--slutsats { flex-direction: column; gap: clamp(0.8rem, 2.5vh, 1.6rem); }
.rt__chain { display: flex; flex-wrap: wrap; gap: clamp(0.6rem, 2vw, 1.4rem); justify-content: center; }
.rt__chain span { display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--font-mono); font-size: clamp(0.9rem, 1.8vw, 1.15rem); letter-spacing: 0.04em; color: var(--color-primary); border: 1px solid var(--color-primary-dim); border-radius: 999px; padding: 0.3em 0.9em; }

/* --- Rödpenna / pil --- */
.rt__pen { position: absolute; overflow: visible; pointer-events: none; }
.rt__pen--spot { left: 64%; top: 60%; width: 6.5rem; height: 5rem; transform: translate(-50%, -50%); }
.rt__pen--inline { position: absolute; left: 50%; top: 50%; width: 118%; height: 180%; transform: translate(-50%, -50%); }
.rt__pen--row { position: absolute; inset: -0.4rem -0.3rem; width: calc(100% + 0.6rem); height: calc(100% + 0.8rem); }
.rt__pen--hair { position: absolute; left: var(--hx, 50%); top: var(--hy, 20%); width: var(--hw, 60%); height: var(--hh, 34%); transform: translate(-50%, -50%); }
.pen { fill: none; stroke: var(--color-danger); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 760; stroke-dashoffset: 760; animation: draw 0.7s var(--ease-out) forwards; animation-delay: var(--d, 0.8s); filter: drop-shadow(0 0 3px rgba(255, 70, 70, 0.5)); }
.pen--arrow { stroke-dasharray: 220; stroke-dashoffset: 220; animation: draw 0.6s var(--ease-out) forwards; animation-delay: var(--d, 1.9s); }

@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes tag-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }

/* --- Navigering --- */
.rt__caption { margin: 0; font-family: var(--font-mono); font-size: clamp(1.25rem, 2.6vw, 1.8rem); line-height: 1.4; color: var(--color-ink-strong); max-width: 52ch; min-height: 2.6em; }
.rt__dots { display: flex; gap: 0.5rem; }
.rt__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.rt__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.rt__btn { font-size: clamp(1.05rem, 2vw, 1.35rem); padding: 0.7em 1.6em; }

/* --- Entré-animationer --- */
.fade-up { opacity: 0; transform: translateY(10px); animation: fade-up 0.4s var(--ease-out) forwards; animation-delay: var(--d, 0s); }
@keyframes fade-up { to { opacity: 1; transform: none; } }
.scene-enter-active, .scene-leave-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.scene-enter-from { opacity: 0; transform: translateY(12px) scale(0.98); }
.scene-leave-to { opacity: 0; transform: translateY(-8px); }

@media (prefers-reduced-motion: reduce) {
  .pen, .pen--arrow { animation: none; stroke-dashoffset: 0; }
  .fade-up, .rt__hair-tag { animation: none; opacity: 1; transform: none; }
  .scene-enter-active, .scene-leave-active { transition: opacity 180ms ease; }
  .scene-enter-from, .scene-leave-to { transform: none; }
}
</style>
