<script setup lang="ts">
/**
 * LABB rollgenomgång — körs i SAMMA vy som det skarpa spelet (mikroskop-ram +
 * de tre hårkategori-behållarna), med scriptade mock-animationer ovanpå:
 * prov → fokusera (tumme på reglage + bild suddig↔skarp) → frys + dra till korg
 * ("vad tror du?") → slut. Ingen separat layout. Innehåll i config.LABB_TUT.
 */
import { ref, computed } from 'vue'
import { LABB_TUT, REF_CASE, HAIR_CLASSES, type HairClassId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Icon from '../components/Icon.vue'
import Placeholder from '../components/Placeholder.vue'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const SCENES = ['prov', 'fokus', 'sortera', 'slut'] as const
type SceneId = (typeof SCENES)[number]
const ix = ref(0)
const scene = computed<SceneId>(() => SCENES[ix.value])
const isLast = computed(() => ix.value >= SCENES.length - 1)

const captions: Record<SceneId, string> = {
  prov: LABB_TUT.prov,
  fokus: LABB_TUT.fokus,
  sortera: LABB_TUT.sort,
  slut: LABB_TUT.slut,
}
const caption = computed(() => captions[scene.value])

/** Vy-tillstånd härlett av scenen (samma element som i spelet). */
const frozen = computed(() => scene.value === 'sortera' || scene.value === 'slut')
const focusing = computed(() => scene.value === 'fokus')
const sorting = computed(() => scene.value === 'sortera')
const TARGET: HairClassId = 'manniska'
const placedIn = (id: HairClassId) => scene.value === 'slut' && id === TARGET

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
  <div class="lt">
    <p class="lt__case"><Icon name="mikroskop" :size="15" /> LABBKONSOL · GENOMGÅNG</p>

    <!-- Samma vy som spelet: mikroskop + kategori-behållare -->
    <div class="cons">
      <!-- Mikroskop -->
      <div class="scope amber-frame">
        <div class="scope__head"><Icon name="mikroskop" :size="16" /> <span class="scope__title">MIKROSKOP</span></div>
        <div class="scope__stage" :class="{ 'scope__stage--frozen': frozen }">
          <Placeholder
            class="scope__img" :class="{ 'scope__img--focus': focusing }"
            :path="REF_CASE.hairImage" :label="REF_CASE.hairLabel"
          />
          <span v-if="frozen" class="scope__frozen-tag"><Icon name="check" :size="13" /> FRYST</span>

          <!-- Fokus-gest: tumme på reglage -->
          <div v-if="focusing" class="lt__dial fade-in">
            <svg viewBox="0 0 100 100" class="lt__dial-face">
              <circle cx="50" cy="50" r="46" />
              <line v-for="d in 12" :key="d" x1="50" y1="6" x2="50" y2="16" :transform="`rotate(${d * 30} 50 50)`" />
            </svg>
            <span class="lt__thumb" aria-hidden="true" />
            <span class="lt__dial-label">FOKUS</span>
          </div>
        </div>
        <div class="scope__tools">
          <button class="scope__btn scope__btn--freeze" :class="{ 'scope__btn--on': frozen }">
            <Icon :name="frozen ? 'check' : 'exponering'" :size="22" />
            {{ frozen ? 'GÅ TILLBAKA' : 'FRYS BILDEN' }}
          </button>
          <!-- Finger som trycker Frys (vid sortera, innan den dras) -->
          <span v-if="sorting" class="lt__tap lt__tap--freeze" aria-hidden="true" />
        </div>
      </div>

      <!-- Fråga vid sortering (stort, i vyn) -->
      <p v-if="sorting" class="lt__q">{{ LABB_TUT.sort_q }}</p>

      <!-- Kategori-behållare (drop-mål) -->
      <section class="lab__classes">
        <div
          v-for="c in HAIR_CLASSES" :key="c.id" class="lab__class amber-frame"
          :class="{ 'lab__class--over': sorting && c.id === TARGET }"
        >
          <div class="lab__class-head">
            <Icon :name="c.icon" :size="26" />
            <span class="lab__class-label ink-strong">{{ c.label }}</span>
            <span class="lab__class-text">{{ c.text }}</span>
          </div>
          <div class="lab__class-grid">
            <div v-if="placedIn(c.id)" class="lab__thumb pop-in"><Placeholder :path="REF_CASE.hairImage" label="" class="lab__thumb-img" /></div>
            <span v-else class="lab__class-empty">släpp bilder här</span>
          </div>
        </div>
      </section>

      <!-- Dragbar miniatyr: åker från mikroskopet ner i Människohår-korgen -->
      <div v-if="sorting" class="lt__dragchip">
        <Placeholder class="lt__dragchip-img" :path="REF_CASE.hairImage" label="" />
        <span class="lt__touch" aria-hidden="true" />
      </div>
    </div>

    <p class="lt__caption">{{ caption }}</p>
    <div class="lt__dots">
      <span v-for="(s, i) in SCENES" :key="s" class="lt__dot" :class="{ 'lt__dot--on': i <= ix }" />
    </div>
    <button class="crt-button crt-button--strong lt__btn" @click="next">
      {{ isLast ? t('onboarding.go_live') : t('onboarding.next') }} ▸
    </button>
  </div>
</template>

<style scoped>
.lt { display: flex; flex-direction: column; align-items: center; gap: clamp(0.4rem, 1.2vh, 0.9rem); height: 100%; padding: clamp(0.6rem, 1.6vh, 1.1rem); text-align: center; }
.lt__case { margin: 0; font-family: var(--font-retro); font-size: clamp(0.85rem, 1.6vw, 1.05rem); letter-spacing: 0.08em; color: var(--color-primary); display: inline-flex; align-items: center; gap: 0.4rem; }

/* ===== Konsol-replika (samma vy som spelet) ===== */
.cons { position: relative; flex: 1 1 auto; width: min(99vw, 92rem); min-height: 0; display: flex; flex-direction: column; gap: 0.6rem; }

.scope { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.scope__head { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--color-primary-dim); }
.scope__title { font-family: var(--font-retro); letter-spacing: 0.08em; color: var(--color-primary); }
.scope__stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
.scope__stage--frozen { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.scope__img { max-width: 100%; max-height: 100%; width: auto; }
.scope__img--focus { animation: focusblur 2.6s ease-in-out infinite; }
@keyframes focusblur { 0%, 100% { filter: blur(6px); } 45%, 55% { filter: blur(0); } }
.scope__frozen-tag { position: absolute; top: 0.5rem; left: 0.5rem; display: inline-flex; align-items: center; gap: 0.3rem; font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.06em; color: var(--color-primary); background: rgba(2, 6, 4, 0.7); padding: 0.1em 0.45em; border-radius: 5px; }
.scope__tools { position: relative; display: flex; gap: 0.6rem; padding: 0.6rem; border-top: 1px solid var(--color-primary-dim); }
.scope__btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; font-family: var(--font-retro); font-size: clamp(1rem, 2vw, 1.3rem); letter-spacing: 0.04em; color: var(--color-ink-muted); background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 10px; padding: 0.7em 0.8em; }
.scope__btn--on { color: var(--color-ink-strong); border-color: var(--color-primary); }

/* Fokus-reglage (overlay i mikroskopvyn) */
.lt__dial { position: absolute; right: clamp(0.8rem, 3vw, 2rem); bottom: clamp(0.8rem, 3vh, 2rem); width: clamp(5rem, 10vw, 8rem); height: clamp(5rem, 10vw, 8rem); }
.lt__dial-face { width: 100%; height: 100%; fill: none; stroke: var(--color-primary); stroke-width: 2; animation: dialrock 2.6s ease-in-out infinite; transform-origin: center; }
.lt__dial-face line { stroke: var(--color-primary-dim); stroke-width: 3; stroke-linecap: round; }
.lt__thumb { position: absolute; top: 6%; left: 50%; width: 26%; height: 34%; background: radial-gradient(circle at 40% 35%, rgba(var(--mode-accent-rgb), 0.9), rgba(var(--mode-accent-rgb), 0.35)); border: 1px solid var(--color-primary); border-radius: 50% 50% 46% 46%; transform-origin: center 150%; animation: thumbrock 2.6s ease-in-out infinite; box-shadow: var(--glow-soft); }
.lt__dial-label { position: absolute; bottom: -1.3rem; left: 0; right: 0; font-family: var(--font-mono); letter-spacing: 0.14em; font-size: 0.72rem; color: var(--color-primary); }
@keyframes dialrock { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
@keyframes thumbrock { 0%, 100% { transform: translateX(-50%) rotate(-16deg); } 50% { transform: translateX(-50%) rotate(16deg); } }

/* Finger som trycker frys-knappen */
.lt__tap--freeze { position: absolute; left: 22%; top: 50%; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.85); box-shadow: 0 0 0 7px rgba(var(--mode-accent-rgb), 0.3); transform: translate(-50%, -50%); animation: tap 1.8s ease-in-out infinite; }
@keyframes tap { 0%, 60%, 100% { transform: translate(-50%, -50%) scale(1); } 75% { transform: translate(-50%, -50%) scale(0.7); } }

.lt__q { margin: 0; font-family: var(--font-retro); font-size: clamp(1.3rem, 3vw, 2.2rem); letter-spacing: 0.03em; color: var(--color-ink-strong); text-shadow: var(--glow-soft); }

.lab__classes { flex: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.lab__class { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.7rem; background: var(--color-background-2); transition: border-color 0.2s var(--ease-out), background 0.2s var(--ease-out); }
.lab__class--over { border-color: var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.12); animation: basketpulse 3s ease-in-out infinite; }
@keyframes basketpulse { 0%, 70%, 100% { box-shadow: none; } 82% { box-shadow: var(--glow-strong); } }
.lab__class-head { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; text-align: center; color: var(--color-primary); }
.lab__class-label { font-family: var(--font-retro); letter-spacing: 0.04em; font-size: clamp(0.9rem, 1.8vw, 1.15rem); }
.lab__class-text { font-family: var(--font-mono); font-size: 0.74rem; color: var(--color-ink-muted); }
.lab__class-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; min-height: 2.8rem; align-content: flex-start; justify-content: center; }
.lab__thumb { position: relative; width: 3.4rem; height: 2.6rem; border: 1px solid var(--color-primary); border-radius: 5px; overflow: hidden; background: #000; }
.lab__thumb-img { width: 100%; height: 100%; }
.pop-in { animation: pop-in 0.3s var(--ease-out); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: none; } }
.lab__class-empty { align-self: center; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-muted); opacity: 0.6; }

/* Dragbar miniatyr (scen sortera) */
.lt__dragchip { position: absolute; left: 50%; top: 34%; width: clamp(3rem, 6vw, 4.4rem); height: clamp(2.2rem, 4.5vw, 3.2rem); border: 2px solid var(--color-primary); border-radius: 8px; overflow: hidden; box-shadow: var(--glow-strong); pointer-events: none; z-index: 5; animation: dragdown 3.2s ease-in-out infinite; }
.lt__dragchip-img { width: 100%; height: 100%; }
.lt__touch { position: absolute; right: -6px; bottom: -6px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.85); box-shadow: 0 0 0 6px rgba(var(--mode-accent-rgb), 0.3); }
@keyframes dragdown {
  0%, 12% { transform: translate(-50%, 0); opacity: 0; }
  22% { transform: translate(-50%, 0); opacity: 1; }
  82% { transform: translate(calc(-50% - 33%), clamp(7rem, 22vh, 13rem)); opacity: 1; }
  92%, 100% { transform: translate(calc(-50% - 33%), clamp(7rem, 22vh, 13rem)); opacity: 0; }
}

/* Navigering + övergångar */
.lt__caption { margin: 0; font-family: var(--font-mono); font-size: clamp(1.1rem, 2.2vw, 1.55rem); line-height: 1.35; color: var(--color-ink-strong); max-width: 54ch; min-height: 2.4em; }
.lt__dots { display: flex; gap: 0.5rem; }
.lt__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1px solid var(--color-primary-dim); }
.lt__dot--on { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
.lt__btn { font-size: clamp(1.05rem, 2vw, 1.35rem); padding: 0.6em 1.5em; }
.fade-in { animation: fade-in 0.4s var(--ease-out); }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .scope__img--focus, .lt__dial-face, .lt__thumb, .lt__tap--freeze, .lt__dragchip, .lab__class--over { animation: none; }
  .scope__img--focus { filter: none; }
  .lt__dragchip { opacity: 1; transform: translate(calc(-50% - 33%), clamp(7rem, 22vh, 13rem)); }
}
</style>
