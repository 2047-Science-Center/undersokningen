<script setup lang="ts">
/**
 * FILMSKÄRM — trogen KOPIA av spelarnas skärm (inte det riktiga skärmläget),
 * animerad i takt med introfilmens beats. Ligger ovanpå 3D-scenen i IntroFilm.vue.
 *
 *   skanna  → FÄLT-konsolen: skannern hittar ett avtryck → IDENTIFIERAD SOM-kortet.
 *   markera → hela loggen läses RAD FÖR RAD; raden som stämmer ringas in, pilar dras
 *             mellan signalementet i loggen och personens signalement → Misstänkt.
 *   sortera → LABB-konsolen: mikroskopbild → Frys → fingret drar bilden till rätt korg
 *             (Människohår, sedan Djurhår). Synkat med 3D-gubbens dra-gest.
 *
 * Ritad i en fast designruta (800×620) som skalas för att passa; allt styrs av
 * `mode` + `progress` (0..1 i beaten) → samma bild varje gång.
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { REF_CASE, HAIR_CLASSES, asset } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import Icon from '../../components/Icon.vue'
import Placeholder from '../../components/Placeholder.vue'

const props = defineProps<{ mode: 'scan' | 'mark' | 'sort'; progress: number }>()
const { t } = useI18n()

const W = 800
const H = 620
const host = ref<HTMLElement | null>(null)
const box = ref<HTMLElement | null>(null)
const scale = ref(1)
let ro: ResizeObserver | null = null
function fit(): void {
  const el = host.value
  if (!el) return
  scale.value = Math.min(el.clientWidth / W, el.clientHeight / H)
}

const p = computed(() => props.progress)
const r = (a: number, b: number) => Math.min(1, Math.max(0, (p.value - a) / (b - a)))
const between = (a: number, b: number) => p.value >= a && p.value < b

/* ------------------------------ FÄLT ------------------------------ */
const dana = REF_CASE.dana
/** Filmens logg (kopia, längre än referensfallets så "läs hela loggen" syns).
 *  `hit` = raden som stämmer med personen; fraserna i `sig` får pilar. */
const FILM_LOG: { time: string; parts: { text: string; sig?: 'clothing' | 'hair' }[]; hit?: boolean }[] = [
  { time: '02:05', parts: [{ text: 'Lugnt i sektorn. Vakten gör sin runda.' }] },
  { time: '02:09', parts: [{ text: 'Man i grå jacka passerar korridoren, stannar inte.' }] },
  { time: '02:11', parts: [{ text: 'Städvagn rullas förbi luckan. Ingen person i bild.' }] },
  {
    time: '02:14', hit: true,
    parts: [{ text: 'Person i ' }, { text: 'orange väst', sig: 'clothing' }, { text: ', ' }, { text: 'ljust långt hår', sig: 'hair' }, { text: ', vid luckan — dröjer länge vid skåpet.' }],
  },
  { time: '02:22', parts: [{ text: 'Man med mörkt, kort hår vid kaffeautomaten.' }] },
  { time: '02:31', parts: [{ text: 'Larmet går. Skåpet står öppet.' }] },
  { time: '02:36', parts: [{ text: 'Vakten återvänder och stänger av larmet.' }] },
]
const HIT = FILM_LOG.findIndex((e) => e.hit)
const SPOTS = [
  { x: 22, y: 18 }, { x: 70, y: 14 }, { x: 40, y: 34 }, { x: 78, y: 40 }, { x: 55, y: 52 },
  { x: 25, y: 60 }, { x: 46, y: 74 }, { x: 78, y: 72 }, { x: 16, y: 86 },
]
const SCAN_SPOT = 2

// skanna: skannern sveper in mot avtrycket, bipp vid 0.55 → kortet (i markera alltid uppe)
const scanRing = computed(() => (props.mode === 'scan' ? r(0.15, 0.55) : 0))
const popup = computed(() => props.mode === 'mark' || p.value >= 0.55)
// markera: läsmarkören går igenom ALLA rader (0.04–0.46), sedan ring + pilar + Misstänkt
const READ0 = 0.04
const READ_STEP = 0.06
const readRow = computed(() => {
  if (props.mode !== 'mark' || p.value < READ0) return -1
  const i = Math.floor((p.value - READ0) / READ_STEP)
  return i < FILM_LOG.length ? i : -1
})
const passedHit = computed(() => props.mode === 'mark' && p.value >= READ0 + HIT * READ_STEP)
const circle = computed(() => (props.mode === 'mark' ? r(0.48, 0.56) : 0))
const arrow1 = computed(() => (props.mode === 'mark' ? r(0.58, 0.67) : 0))
const arrow2 = computed(() => (props.mode === 'mark' ? r(0.66, 0.75) : 0))
const tapSuspect = computed(() => props.mode === 'mark' && between(0.78, 0.84))
const marked = computed(() => props.mode === 'mark' && p.value >= 0.81)

/* ------------------------------ LABB ------------------------------ */
// två prover: människa (0–0.5) → Människohår, djur (0.52–0.95) → Djurhår
const second = computed(() => p.value >= 0.51)
const lp = computed(() => (second.value ? (p.value - 0.52) / 0.43 : p.value / 0.5)) // lokal 0..1 per prov
const lr = (a: number, b: number) => Math.min(1, Math.max(0, (lp.value - a) / (b - a)))
const focus = computed(() => lr(0.02, 0.3)) // bilden skärps
const tapFreeze = computed(() => lp.value >= 0.34 && lp.value < 0.42)
const frozen = computed(() => lp.value >= 0.38)
const drag = computed(() => lr(0.56, 0.9)) // fingret drar bilden till korgen
const dropped = computed(() => lp.value >= 0.9)
const placedHuman = computed(() => second.value || dropped.value)
const placedAnimal = computed(() => second.value && dropped.value)
const targetCat = computed(() => (second.value ? 1 : 0))
const humanSrc = asset(REF_CASE.hairImage)

/* ------------------------------ finger (touch) ------------------------------ */
// fingret: position i designrutan + tryck
interface Pt { x: number; y: number }
const SUSPECT_BTN: Pt = { x: 252, y: 520 }
const FREEZE_BTN: Pt = { x: 400, y: 418 }
const SCOPE_C: Pt = { x: 400, y: 245 }
const CAT_C = (i: number): Pt => ({ x: 140 + i * 260, y: 540 })
const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
const ease = (u: number) => u * u * (3 - 2 * u)
const finger = computed<{ x: number; y: number; down: boolean } | null>(() => {
  if (props.mode === 'mark') {
    if (p.value < 0.74 || p.value > 0.9) return null
    return { ...lerp({ x: 380, y: 600 }, SUSPECT_BTN, ease(r(0.74, 0.79))), down: tapSuspect.value }
  }
  if (props.mode === 'sort') {
    if (lp.value < 0.26 || lp.value > 0.97) return null
    if (lp.value < 0.5) return { ...lerp({ x: 560, y: 600 }, FREEZE_BTN, ease(lr(0.26, 0.34))), down: tapFreeze.value }
    // grip i bilden och dra till korgen
    const at = lerp(SCOPE_C, CAT_C(targetCat.value), ease(drag.value))
    return { ...at, down: lp.value >= 0.54 && lp.value < 0.9 }
  }
  return null
})
const ghost = computed<Pt | null>(() => {
  if (props.mode !== 'sort' || lp.value < 0.54 || lp.value >= 0.9) return null
  return lerp(SCOPE_C, CAT_C(targetCat.value), ease(drag.value))
})

/* ------------------------------ pilar (mäts i DOM) ------------------------------ */
const arrows = ref<{ d: string; len: number }[]>([])
// vanliga (icke-reaktiva) objekt — template-refs skrivs här varje render utan att trigga om-rendering
const logSig: Record<string, HTMLElement | null> = {}
const cardSig: Record<string, HTMLElement | null> = {}
function rel(el: HTMLElement | null | undefined, where: 'left' | 'top'): Pt | null {
  if (!el || !box.value) return null
  const b = box.value.getBoundingClientRect()
  const e = el.getBoundingClientRect()
  const s = scale.value || 1
  return where === 'left'
    ? { x: (e.left - b.left) / s, y: ((e.top + e.bottom) / 2 - b.top) / s }
    : { x: ((e.left + e.right) / 2 - b.left) / s, y: (e.top - b.top) / s }
}
async function measure(): Promise<void> {
  await nextTick()
  const out: { d: string; len: number }[] = []
  for (const k of ['clothing', 'hair']) {
    const a = rel(logSig[k], 'top') // ovanför frasen i loggen
    const b = rel(cardSig[k], 'top') // ovanför ordet i kortet
    if (!a || !b) continue
    // båge som går upp och över, landar ovanifrån på ordet (korsar ingen text)
    const lift = 70 + (k === 'hair' ? 25 : 0)
    const d = `M ${a.x} ${a.y - 3} C ${a.x} ${a.y - lift}, ${b.x} ${b.y - lift}, ${b.x} ${b.y - 4}`
    out.push({ d, len: Math.hypot(a.x - b.x, a.y - b.y) * 1.3 })
  }
  arrows.value = out
}
watch(() => props.mode, measure)
watch(() => arrow1.value > 0, measure) // mät om när kortet har landat (efter pop-animationen)
watch(scale, measure)

onMounted(() => {
  fit()
  ro = new ResizeObserver(() => { fit(); measure() })
  if (host.value) ro.observe(host.value)
  measure()
})
onUnmounted(() => ro?.disconnect())
</script>

<template>
  <div ref="host" class="fs">
    <div
      ref="box" class="fs__box amber-frame"
      :style="{ width: W + 'px', height: H + 'px', transform: `translate(-50%, 0) scale(${scale})` }"
    >
      <!-- ============================ FÄLT ============================ -->
      <template v-if="mode !== 'sort'">
        <header class="fs__head">
          <div class="fs__role">
            <Icon name="scanner" :size="24" />
            <div>
              <h2 class="fs__title">{{ t('falt.title') }}</h2>
              <p class="fs__sub">{{ t('role.falt') }} · {{ t('valv.nord') }}</p>
            </div>
          </div>
          <span class="fs__fakebtn">GISSA TJUVEN ▸</span>
        </header>

        <section class="fs__suspects">
          <span class="fs__suspects-title"><Icon name="person" :size="14" /> {{ t('falt.suspects_title') }}</span>
          <Transition name="pop">
            <div v-if="marked" class="fs__suspect"><Placeholder class="fs__suspect-img" :path="dana.image" :label="dana.name" /></div>
          </Transition>
          <span v-if="!marked" class="fs__muted">{{ t('falt.suspects_empty') }}</span>
        </section>

        <div class="fs__body">
          <!-- Fingeravtrycksyta -->
          <section class="fs__surface-wrap">
            <div class="fs__panel-head"><Icon name="finger" :size="14" /> {{ t('falt.surface') }}</div>
            <div class="fs__surface amber-frame">
              <span
                v-for="(s, i) in SPOTS" :key="i" class="fs__spot"
                :class="{ 'fs__spot--hot': i === SCAN_SPOT && (scanRing > 0 || popup) }"
                :style="{ left: s.x + '%', top: s.y + '%' }"
              ><Icon name="finger" :size="24" /></span>
              <!-- skannerns ring som sveper in mot avtrycket -->
              <span
                v-if="mode === 'scan' && scanRing > 0 && scanRing < 1" class="fs__scanring"
                :style="{ left: SPOTS[SCAN_SPOT].x + '%', top: SPOTS[SCAN_SPOT].y + '%', transform: `translate(-50%,-50%) scale(${2.4 - 1.4 * scanRing})`, opacity: 0.4 + 0.6 * scanRing }"
              />

              <!-- IDENTIFIERAD SOM-kortet -->
              <Transition name="pop">
                <div v-if="popup" class="fs__card amber-frame">
                  <Placeholder class="fs__photo" :path="dana.image" :label="dana.name" />
                  <span class="fs__eyebrow">{{ t('falt.identified_as') }}</span>
                  <span class="fs__name">{{ dana.name }}</span>
                  <span class="fs__sig">
                    <span :ref="(el) => (cardSig.clothing = el as HTMLElement)" class="fs__sigword" :class="{ 'fs__sigword--on': arrow1 > 0.9 }">{{ dana.clothing }}</span>
                    · hår:
                    <span :ref="(el) => (cardSig.hair = el as HTMLElement)" class="fs__sigword" :class="{ 'fs__sigword--on': arrow2 > 0.9 }">{{ dana.hair }}</span>
                  </span>
                  <span class="fs__prints mono"><Icon name="finger" :size="16" /> {{ t('falt.prints_count', { n: 1 }) }}</span>
                  <div class="fs__decide">
                    <span class="fs__btn">{{ t('falt.not_suspect') }}</span>
                    <span class="fs__btn fs__btn--yes" :class="{ 'fs__btn--on': marked, 'fs__btn--press': tapSuspect }">
                      <Icon name="person" :size="14" /> {{ t('falt.suspect') }}
                    </span>
                  </div>
                </div>
              </Transition>
            </div>
          </section>

          <!-- Händelselogg -->
          <section class="fs__log amber-frame" :class="{ 'fs__log--focus': mode === 'mark' }">
            <h3 class="fs__log-title"><Icon name="logg" :size="14" /> {{ t('falt.log_title') }}</h3>
            <p class="fs__log-head mono">ÄRENDE 2-911 · ÖVERVAKNINGSLOGG · SEKTOR C</p>
            <ul class="fs__log-list">
              <li
                v-for="(e, i) in FILM_LOG" :key="i" class="fs__log-row"
                :class="{
                  'fs__log-row--reading': readRow === i,
                  'fs__log-row--read': mode === 'mark' && (readRow > i || readRow === -1 && p >= READ0),
                  'fs__log-row--hit': e.hit && passedHit,
                }"
              >
                <span class="fs__log-time mono">{{ e.time }}</span>
                <span class="fs__log-text">
                  <template v-for="(part, k) in e.parts" :key="k">
                    <span
                      v-if="part.sig" :ref="(el) => (logSig[part.sig!] = el as HTMLElement)"
                      class="fs__sigword" :class="{ 'fs__sigword--on': (part.sig === 'clothing' ? arrow1 : arrow2) > 0 }"
                    >{{ part.text }}</span>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
                <!-- handritad röd ring runt raden som stämmer -->
                <svg v-if="e.hit && circle > 0" class="fs__circle" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path
                    d="M 52 3 C 84 2, 98 10, 98 20 C 98 32, 78 38, 50 38 C 20 38, 2 32, 2 20 C 2 8, 24 2, 60 5"
                    pathLength="1" :style="{ strokeDashoffset: 1 - circle }"
                  />
                </svg>
              </li>
            </ul>
            <p v-if="mode === 'mark' && readRow >= 0" class="fs__reading mono">läser rad för rad…</p>
          </section>
        </div>

        <!-- pilar: signalement i loggen → personens signalement -->
        <svg v-if="mode === 'mark'" class="fs__arrows" :viewBox="`0 0 ${W} ${H}`">
          <defs>
            <marker id="fs-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" class="fs__ah" />
            </marker>
          </defs>
          <path
            v-for="(a, i) in arrows" :key="i" :d="a.d" class="fs__arrow" pathLength="1"
            :marker-end="(i === 0 ? arrow1 : arrow2) > 0.95 ? 'url(#fs-ah)' : undefined"
            :style="{ strokeDashoffset: 1 - (i === 0 ? arrow1 : arrow2) }"
          />
        </svg>
      </template>

      <!-- ============================ LABB ============================ -->
      <template v-else>
        <header class="fs__head">
          <div class="fs__role">
            <Icon name="mikroskop" :size="24" />
            <div>
              <h2 class="fs__title">{{ t('lab.title') }}</h2>
              <p class="fs__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
            </div>
          </div>
        </header>

        <section class="fs__scope amber-frame">
          <div class="fs__panel-head"><Icon name="mikroskop" :size="14" /> MIKROSKOP</div>
          <div class="fs__scope-view" :class="{ 'fs__scope-view--frozen': frozen }">
            <img v-if="!second" :src="humanSrc" alt="" class="fs__hairimg" :style="{ filter: `blur(${(1 - focus) * 10}px)` }" />
            <svg v-else class="fs__hairimg" viewBox="0 0 200 120" :style="{ filter: `blur(${(1 - focus) * 10}px)` }">
              <!-- djurhår: bandad färg, bred märg -->
              <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal" />
              <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal-bands" />
              <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal-marrow" />
            </svg>
            <span v-if="frozen" class="fs__frozen-tag mono">FRUSEN</span>
          </div>
          <span class="fs__freeze" :class="{ 'fs__btn--press': tapFreeze }">⚠ {{ t('mikroskop.freeze') }}</span>
        </section>

        <section class="fs__classes">
          <div
            v-for="(c, i) in HAIR_CLASSES" :key="c.id" class="fs__class amber-frame"
            :class="{ 'fs__class--target': ghost && targetCat === i, 'fs__class--human': i === 0 && placedHuman }"
          >
            <Icon :name="c.icon" :size="22" />
            <span class="fs__class-label">{{ c.label }}</span>
            <span class="fs__class-text">{{ c.text }}</span>
            <div class="fs__class-grid">
              <img v-if="i === 0 && placedHuman" :src="humanSrc" alt="" class="fs__thumb" />
              <svg v-else-if="i === 1 && placedAnimal" class="fs__thumb" viewBox="0 0 200 120">
                <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal" />
                <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal-bands" />
              </svg>
              <span v-else class="fs__muted">{{ t('lab.empty_class') }}</span>
            </div>
          </div>
        </section>

        <!-- spöket som dras -->
        <div v-if="ghost" class="fs__ghost" :style="{ left: ghost.x + 'px', top: ghost.y + 'px' }">
          <img v-if="!second" :src="humanSrc" alt="" />
          <svg v-else viewBox="0 0 200 120">
            <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal" />
            <path d="M -10 80 C 40 40, 120 100, 210 30" class="fs__animal-bands" />
          </svg>
        </div>
      </template>

      <!-- fingret (touch-markör) -->
      <div
        v-if="finger" class="fs__finger" :class="{ 'fs__finger--down': finger.down }"
        :style="{ left: finger.x + 'px', top: finger.y + 'px' }"
      >
        <span class="fs__finger-ring" />
        <svg class="fs__hand" viewBox="0 0 24 24"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10h.5V8.5a1.5 1.5 0 0 1 3 0V10h.5v-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4.3 14a1.5 1.5 0 0 1 2.4-1.8L9 14z" /></svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fs { position: absolute; inset: 0; pointer-events: none; }
.fs__box {
  position: absolute; top: 0; left: 50%; transform-origin: top center;
  background: rgba(5, 10, 8, 0.96); padding: 18px 20px; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 10px; font-size: 14px; overflow: hidden;
}
.fs__head { display: flex; align-items: center; justify-content: space-between; }
.fs__role { display: flex; align-items: center; gap: 10px; color: var(--color-primary); }
.fs__title { margin: 0; font-size: 20px; letter-spacing: 0.06em; color: var(--color-primary); }
.fs__sub { margin: 0; font-family: var(--font-mono); font-size: 11px; color: var(--color-ink-muted); }
.fs__fakebtn { font-family: var(--font-retro); font-size: 13px; padding: 6px 12px; border: 1px solid var(--color-primary-dim); border-radius: 6px; color: var(--color-ink-muted); }
.fs__muted { font-family: var(--font-mono); font-size: 11px; color: var(--color-ink-muted); }

.fs__suspects { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 12px; border: 1px solid var(--color-primary-dim); border-radius: 6px; }
.fs__suspects-title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--color-primary); display: inline-flex; gap: 4px; align-items: center; }
.fs__suspect { width: 40px; height: 40px; border-radius: 4px; overflow: hidden; border: 2px solid var(--color-primary); box-shadow: var(--glow-soft); }
.fs__suspect-img { width: 100%; height: 100%; }

.fs__body { flex: 1; min-height: 0; display: grid; grid-template-columns: 300px 1fr; gap: 12px; }
.fs__panel-head { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--color-primary); display: flex; gap: 5px; align-items: center; margin-bottom: 6px; }
.fs__surface-wrap { display: flex; flex-direction: column; min-height: 0; }
.fs__surface { position: relative; flex: 1; background: repeating-linear-gradient(0deg, transparent 0 23px, rgba(var(--mode-accent-rgb), 0.05) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, rgba(var(--mode-accent-rgb), 0.05) 23px 24px); }
.fs__spot { position: absolute; transform: translate(-50%, -50%); color: var(--color-primary-dim); }
.fs__spot--hot { color: var(--color-primary); filter: drop-shadow(0 0 6px var(--color-primary)); }
.fs__scanring { position: absolute; width: 56px; height: 56px; border-radius: 50%; border: 3px solid var(--color-primary); box-shadow: 0 0 14px var(--color-primary); }

.fs__card { position: absolute; inset: 14px 10px; background: rgba(6, 12, 10, 0.97); padding: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.fs__photo { width: 120px; height: 120px; border-radius: 6px; overflow: hidden; align-self: center; margin-bottom: 4px; }
.fs__eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; color: var(--color-ink-muted); }
.fs__name { font-family: var(--font-retro); font-size: 22px; color: var(--color-ink-strong); }
.fs__sig { font-family: var(--font-mono); font-size: 13px; color: var(--color-primary); }
.fs__prints { font-size: 12px; color: var(--color-ink-muted); display: inline-flex; gap: 4px; align-items: center; }
.fs__decide { display: flex; gap: 8px; margin-top: auto; width: 100%; }
.fs__btn { flex: 1; text-align: center; font-family: var(--font-retro); font-size: 13px; padding: 8px 6px; border: 1px solid var(--color-primary-dim); border-radius: 6px; color: var(--color-ink-muted); display: inline-flex; gap: 4px; align-items: center; justify-content: center; transition: transform 0.12s, background 0.2s; }
.fs__btn--yes { border-color: var(--color-primary); color: var(--color-primary); }
.fs__btn--on { background: var(--color-primary); color: #050a08; box-shadow: var(--glow-strong); }
.fs__btn--press { transform: scale(0.94); }

.fs__sigword { border-radius: 3px; transition: background 0.3s, box-shadow 0.3s; }
.fs__sigword--on { background: rgba(var(--mode-accent-rgb), 0.28); box-shadow: 0 0 0 2px rgba(var(--mode-accent-rgb), 0.55); color: var(--color-ink-strong); }

.fs__log { display: flex; flex-direction: column; min-height: 0; padding: 10px 12px; transition: box-shadow 0.4s; }
.fs__log--focus { box-shadow: var(--frame-glow); }
.fs__log-title { margin: 0; font-size: 12px; letter-spacing: 0.08em; color: var(--color-primary); display: flex; gap: 5px; align-items: center; }
.fs__log-head { margin: 4px 0 8px; font-size: 10px; color: var(--color-ink-muted); }
.fs__log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.fs__log-row { position: relative; display: grid; grid-template-columns: 52px 1fr; gap: 8px; padding: 6px 8px; border-radius: 4px; color: var(--color-primary); line-height: 1.35; transition: background 0.2s, opacity 0.3s; }
.fs__log-row--reading { background: rgba(var(--mode-accent-rgb), 0.22); box-shadow: inset 3px 0 0 var(--color-primary); }
.fs__log-row--read { opacity: 0.55; }
.fs__log-row--hit { z-index: 2; opacity: 1; background: rgba(var(--mode-accent-rgb), 0.12); color: var(--color-ink-strong); }
.fs__log-time { font-size: 13px; color: var(--color-ink-strong); }
.fs__log-text { font-size: 13px; }
.fs__reading { margin: auto 0 0; font-size: 11px; color: var(--color-ink-muted); animation: blink 0.9s steps(2) infinite; }
.fs__circle { position: absolute; z-index: 3; pointer-events: none; inset: -6px -8px; width: calc(100% + 16px); height: calc(100% + 12px); overflow: visible; }
.fs__circle path { fill: none; stroke: var(--color-danger); stroke-width: 3.5; stroke-linecap: round; stroke-dasharray: 1; vector-effect: non-scaling-stroke; }

.fs__arrows { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.fs__arrow { fill: none; stroke: var(--color-danger); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1; filter: drop-shadow(0 0 4px rgba(255, 90, 60, 0.6)); }
.fs__ah { fill: var(--color-danger); }

/* LABB */
.fs__scope { flex: 1; display: flex; flex-direction: column; padding: 10px; min-height: 0; }
.fs__scope-view { position: relative; flex: 1; background: #000; border-radius: 4px; overflow: hidden; display: grid; place-items: center; }
.fs__scope-view--frozen { box-shadow: inset 0 0 0 3px var(--color-primary); }
.fs__hairimg { width: 100%; height: 100%; object-fit: cover; }
.fs__animal { fill: none; stroke: #c9a46a; stroke-width: 16; stroke-linecap: round; }
.fs__animal-bands { fill: none; stroke: #4a3418; stroke-width: 16; stroke-dasharray: 10 14; }
.fs__animal-marrow { fill: none; stroke: #1c1408; stroke-width: 6; }
.fs__frozen-tag { position: absolute; z-index: 2; top: 8px; right: 10px; font-size: 12px; padding: 2px 8px; border-radius: 3px; background: var(--color-primary); color: #050a08; }
.fs__freeze { margin-top: 8px; text-align: center; font-family: var(--font-retro); font-size: 14px; letter-spacing: 0.06em; padding: 10px; border: 1px solid var(--color-primary-dim); border-radius: 6px; color: var(--color-primary); transition: transform 0.12s; }
.fs__classes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; height: 170px; }
.fs__class { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px; color: var(--color-primary); text-align: center; transition: box-shadow 0.3s; }
.fs__class--target { box-shadow: var(--frame-glow), inset 0 0 0 2px var(--color-primary); }
.fs__class--human { box-shadow: var(--glow-strong), inset 0 0 0 2px var(--color-primary); }
.fs__class-label { font-family: var(--font-retro); font-size: 15px; color: var(--color-ink-strong); }
.fs__class-text { font-size: 11px; }
.fs__class-grid { margin-top: auto; min-height: 50px; display: grid; place-items: center; }
.fs__thumb { width: 70px; height: 46px; object-fit: cover; border: 1px solid var(--color-primary); border-radius: 3px; background: #000; }
.fs__ghost { position: absolute; width: 110px; height: 70px; transform: translate(-50%, -50%) rotate(-4deg); border: 2px solid var(--color-primary); border-radius: 4px; overflow: hidden; background: #000; box-shadow: var(--glow-strong); }
.fs__ghost img, .fs__ghost svg { width: 100%; height: 100%; object-fit: cover; }

/* fingret */
.fs__finger { position: absolute; width: 0; height: 0; z-index: 5; }
.fs__finger-ring { position: absolute; left: -18px; top: -18px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.35); border: 2px solid rgba(255, 255, 255, 0.9); transition: transform 0.15s, background 0.15s; }
.fs__finger--down .fs__finger-ring { transform: scale(0.75); background: rgba(255, 255, 255, 0.7); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.15); }
.fs__hand { position: absolute; left: -10px; top: 6px; width: 44px; height: 44px; fill: #fff; stroke: #050a08; stroke-width: 1; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)); }

.pop-enter-active, .pop-leave-active { transition: opacity 0.35s, transform 0.35s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.94); }
@keyframes blink { 50% { opacity: 0.35; } }
</style>
