<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Mikroskopet överst; operatören FRYSER ett hårstrå →
 * stillbild → DRAR den till en av tre hårkategori-containrar. Placerade bilder
 * kan öppnas i helskärm: TILLBAKA (ingen ändring) eller TA BORT BILDEN (ångra en
 * sortering och skanna/sortera om). Coach-marks introducerar uppdraget vid live-start.
 *
 * Maddes test 2026-11-20: labbet blev klart långt före fältet. Därför: "VI ÄR KLARA" → GRANSKA —
 * jämför era bilder med kända prov (REF_HAR), flytta/ta bort, eller skanna fler. Vid verdiktet
 * visar labbet de misstänkta (helskärm, bläddra) bredvid sina människohår, så att båda sidor kan
 * jämföra innan fältet pekar ut tjuven.
 *
 * Bilderna är LOKALA för labb-fönstret (skickas aldrig över reläet — tungt).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { HAIR_CLASSES, PERSONS, REF_HAR, asset, type HairClassId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { LABB } from '../ljus'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Microscope from './Microscope.vue'
import Icon from './Icon.vue'
import Lightbox from './Lightbox.vue'
import CoachMarks from './CoachMarks.vue'
import MissionBox from './MissionBox.vue'
import PersonViewer from './PersonViewer.vue'

const store = useUndersokningenStore()
const { t } = useI18n()
const verdicting = computed(() => store.phase === 'verdict')

interface Placed { id: string; src: string; category: HairClassId }
let seq = 0
const pending = ref<{ id: string; src: string } | null>(null)
const placed = ref<Placed[]>([])
/** Placerad bild som visas i helskärm (null = stängd). */
const visad = ref<Placed | null>(null)
const klassNamn = (id: HairClassId | undefined) => HAIR_CLASSES.find((c) => c.id === id)?.label ?? ''
/** Sortera (mikroskopet) eller granska (jämför med kända prov) — efter "VI ÄR KLARA". */
const lage = ref<'sortera' | 'granska'>('sortera')
function klara(): void {
  lage.value = 'granska'
  audio.play('confirm')
  store.notifyActivity()
}
function skannaFler(): void {
  lage.value = 'sortera'
  store.notifyActivity()
}
/** Referensbild i helskärm (kända prov). */
const refVisad = ref<{ image: string; label: string } | null>(null)
/** Flytta en placerad bild till en annan korg (efter jämförelsen). */
function flytta(cat: HairClassId): void {
  const v = visad.value
  if (!v) return
  placed.value = placed.value.map((p) => (p.id === v.id ? { ...p, category: cat } : p))
  visad.value = null
  audio.play('confirm')
  useLjus().gest('kvitto', [LABB], { tyst: true })
  store.notifyActivity()
}
/* ---- verdikt: jämför människohåren med de misstänkta ---- */
const misstankta = computed(() => (store.revealedPersons.length ? store.revealedPersons : PERSONS.map((p) => ({ ...p, count: 0 }))))
const personVisas = ref<number | null>(null)
const scopeRef = ref<InstanceType<typeof Microscope> | null>(null)

function onCapture(src: string): void {
  // En frysning i taget att sortera: ersätt ev. osorterad fångst.
  pending.value = { id: 'spec-' + seq++, src }
  store.notifyActivity()
}
/** Fingret sätts på den frysta mikroskopbilden → starta drag direkt därifrån. */
function onGrab(e: PointerEvent): void {
  startDrag(e)
}
function placedIn(cat: HairClassId): Placed[] {
  return placed.value.filter((p) => p.category === cat)
}
function stangBild(): void {
  visad.value = null
  store.notifyActivity()
}
/** Ångra en sortering: bilden tas bort ur sin korg. */
function taBortBild(): void {
  const id = visad.value?.id
  if (id) placed.value = placed.value.filter((p) => p.id !== id)
  visad.value = null
  audio.play('nobuy') // mjuk sjunkande kvint, inte fel-surret
  store.notifyActivity()
}

/* ---- pointer-drag (touch-vänligt, ingen HTML5 DnD) ---- */
const drag = ref<{ src: string; x: number; y: number } | null>(null)
const overCat = ref<HairClassId | null>(null)

function catUnder(x: number, y: number): HairClassId | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')
  return (el?.dataset.drop as HairClassId) ?? null
}
function onMove(e: PointerEvent): void {
  if (!drag.value) return
  drag.value = { ...drag.value, x: e.clientX, y: e.clientY }
  overCat.value = catUnder(e.clientX, e.clientY)
}
function onUp(e: PointerEvent): void {
  const cat = catUnder(e.clientX, e.clientY)
  if (cat && pending.value) {
    placed.value.push({ id: pending.value.id, src: pending.value.src, category: cat })
    pending.value = null
    audio.play('confirm')
    // Bara kvitto: appen vet inte om provet hamnade rätt (ingen facit-kontroll, F9) → inte rätt/fel.
    useLjus().gest('kvitto', [LABB], { tyst: true })
    scopeRef.value?.release() // tillbaka till live för nästa prov
    store.notifyActivity()
  }
  drag.value = null
  overCat.value = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}
function startDrag(e: PointerEvent): void {
  if (!pending.value) return
  drag.value = { src: pending.value.src, x: e.clientX, y: e.clientY }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

/* ---- coach-marks (per sida, en gång vid live-start) ---- */
const singleSide = computed(() => store.view !== 'shared')
const coachActive = ref(false)
let coachSeen = false
const coachSteps = computed(() => [
  { target: 'scope', title: t('coach.lab_scan_title'), text: t('coach.lab_scan_text') },
  { target: 'categories', title: t('coach.lab_mission_title'), text: t('coach.lab_mission_text') },
  { target: 'freeze', title: t('coach.lab_freeze_title'), text: t('coach.lab_freeze_text') },
  { target: 'categories', title: t('coach.lab_drag_title'), text: t('coach.lab_drag_text') },
  { title: t('coach.lab_help_title'), text: t('coach.lab_help_text') },
])
/** Coach-marks är avstängda på LABB — den animerade rollgenomgången (pre-gate)
 *  täcker scanna/frys/sortera. Behålls i koden om vi vill slå på dem igen. */
const COACH_ENABLED = false
function maybeCoach(): void {
  if (COACH_ENABLED && store.onbStage === 'live' && store.phase === 'investigate' && !coachSeen && singleSide.value) {
    coachSeen = true
    coachActive.value = true
  }
}
watch(() => [store.onbStage, store.phase], maybeCoach)
onMounted(maybeCoach)
watch(
  () => store.resetSignal,
  () => {
    coachSeen = false
    coachActive.value = false
    pending.value = null
    placed.value = []
    visad.value = null
    lage.value = 'sortera'
    refVisad.value = null
    personVisas.value = null
  },
)
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <div class="lab__role">
        <Icon name="mikroskop" :size="26" />
        <div>
          <h2 class="lab__title">{{ t('lab.title') }}</h2>
          <p class="lab__sub">{{ t('role.labb') }} · {{ t('valv.syd') }}</p>
        </div>
      </div>
      <div class="lab__head-right">
        <MissionBox role="labb" />
        <div v-if="lage === 'sortera' && placed.length" class="lab__done-wrap">
          <span class="lab__done-hint">{{ t('lab.done_hint') }}</span>
          <button class="crt-button crt-button--strong lab__done" @click="klara">{{ t('lab.done') }}</button>
        </div>
        <button v-else-if="lage === 'granska'" class="crt-button lab__done" @click="skannaFler">{{ t('lab.review_rescan') }}</button>
      </div>
    </header>

    <!-- Mikroskopet ligger kvar monterat (kameran startar inte om) men döljs medan man granskar -->
    <Microscope v-show="lage === 'sortera'" ref="scopeRef" class="lab__scope" data-coach="scope" @capture="onCapture" @grab="onGrab" />

    <!-- GRANSKA: kända prov att jämföra med -->
    <section v-if="lage === 'granska'" class="lab__review amber-frame">
      <div class="lab__review-head">
        <span class="lab__review-title">{{ t('lab.review_title') }}</span>
        <span class="lab__review-hint">{{ t('lab.review_hint') }}</span>
      </div>
      <div class="lab__ref-cols">
        <div v-for="c in HAIR_CLASSES" :key="c.id" class="lab__ref-col">
          <span class="lab__ref-label ink-strong"><Icon :name="c.icon" :size="18" /> {{ c.label }}</span>
          <span class="lab__class-text">{{ c.text }}</span>
          <div class="lab__ref-row">
            <button v-for="r in REF_HAR[c.id]" :key="r.image" class="lab__ref" :title="r.label" @click="refVisad = r">
              <img :src="asset(r.image)" :alt="r.label" />
              <span class="lab__ref-cap mono">{{ r.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Tre hårkategori-containrar (drop-mål) — dra provet hit från mikroskopet -->
    <section class="lab__classes" data-coach="categories">
      <div
        v-for="c in HAIR_CLASSES" :key="c.id" class="lab__class amber-frame"
        :class="{ 'lab__class--over': overCat === c.id, 'lab__class--drop': !!drag }" :data-drop="c.id"
      >
        <div class="lab__class-head">
          <Icon :name="c.icon" :size="26" />
          <span class="lab__class-label ink-strong">{{ c.label }}</span>
          <span class="lab__class-text">{{ c.text }}</span>
        </div>
        <div class="lab__class-grid">
          <button
            v-for="p in placedIn(c.id)" :key="p.id" class="lab__thumb" :title="t('lab.tap_fullscreen')"
            @click="visad = p"
          >
            <img :src="p.src" alt="" />
          </button>
          <span v-if="!placedIn(c.id).length" class="lab__class-empty">{{ t('lab.empty_class') }}</span>
        </div>
      </div>
    </section>

    <!-- Vid verdikt: jämför människohåren med de misstänkta innan fältet pekar ut tjuven -->
    <div v-if="verdicting" class="lab__verdict">
      <p class="lab__verdict-big">{{ t('lab.verdict_title') }}</p>
      <p class="lab__verdict-sub">{{ t('lab.verdict_hint') }}</p>
      <div class="lab__vd-persons">
        <button v-for="(p, i) in misstankta" :key="p.id" class="lab__vd-person amber-frame" @click="personVisas = i">
          <img :src="asset(p.image)" :alt="p.name" />
          <span class="lab__vd-name ink-strong">{{ p.name }}</span>
        </button>
      </div>
      <span class="lab__vd-label">{{ t('lab.verdict_hair') }}</span>
      <div class="lab__vd-hair">
        <button v-for="p in placedIn('manniska')" :key="p.id" class="lab__vd-hairimg" @click="visad = p"><img :src="p.src" alt="" /></button>
        <span v-if="!placedIn('manniska').length" class="lab__class-empty">{{ t('lab.verdict_none_hair') }}</span>
      </div>
    </div>
    <PersonViewer :personer="misstankta" :index="personVisas" @update:index="personVisas = $event" @close="personVisas = null" />

    <!-- Drag-spöke -->
    <div v-if="drag" class="lab__ghost" :style="{ left: drag.x + 'px', top: drag.y + 'px' }">
      <img :src="drag.src" alt="" />
    </div>

    <CoachMarks :steps="coachSteps" :active="coachActive" @done="coachActive = false" />
    <!-- Egen bild i helskärm: jämför med kända prov, flytta, ta bort eller gå tillbaka -->
    <Transition name="cmp">
      <div v-if="visad" class="lab__cmp" @click.self="stangBild">
        <div class="lab__cmp-main">
          <span class="lab__cmp-label mono">{{ t('lab.review_yours') }} · {{ klassNamn(visad.category) }}</span>
          <img class="lab__cmp-img" :src="visad.src" alt="" />
        </div>
        <div class="lab__cmp-refs">
          <span class="lab__cmp-label mono">{{ t('lab.review_ref') }}</span>
          <div v-for="c in HAIR_CLASSES" :key="c.id" class="lab__cmp-refrow" :class="{ 'lab__cmp-refrow--cur': c.id === visad.category }">
            <span class="lab__cmp-refname">{{ c.label }}</span>
            <img v-for="r in REF_HAR[c.id]" :key="r.image" :src="asset(r.image)" :alt="r.label" :title="r.label" />
          </div>
        </div>
        <div class="lab__cmp-actions">
          <button class="crt-button lab__lb-btn" @click="stangBild">{{ t('lab.photo_back') }}</button>
          <button
            v-for="c in HAIR_CLASSES.filter((k) => k.id !== visad!.category)" :key="c.id"
            class="crt-button crt-button--strong lab__lb-btn" @click="flytta(c.id)"
          >
            {{ t('lab.move_to', { cat: c.label.toUpperCase() }) }}
          </button>
          <button class="crt-button lab__lb-btn lab__lb-btn--del" @click="taBortBild">
            <Icon name="close" :size="26" /> {{ t('lab.photo_delete') }}
          </button>
        </div>
      </div>
    </Transition>
    <Lightbox :src="refVisad ? asset(refVisad.image) : null" :label="refVisad ? `${t('lab.review_ref')} · ${refVisad.label}` : ''" @close="refVisad = null" />
  </div>
</template>

<style scoped>
.lab { display: flex; flex-direction: column; gap: 0.6rem; height: 100%; min-height: 0; position: relative; }
.lab__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.lab__role { display: flex; align-items: center; gap: 0.7rem; }
.lab__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.lab__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__scope { flex: 1 1 auto; min-height: 200px; }

.lab__classes { flex: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
.lab__class {
  display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 0.8rem; background: var(--color-background-2);
  transition: border-color 0.14s var(--ease-out), background 0.14s var(--ease-out), box-shadow 0.14s var(--ease-out);
}
.lab__class--drop { border-style: dashed; border-color: var(--color-primary); }
.lab__class--over { border-style: solid; border-color: var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.18); box-shadow: var(--glow-strong); transform: scale(1.02); }
.lab__class-head { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-align: center; }
.lab__class-label { font-family: var(--font-retro); font-size: 1.15rem; letter-spacing: 0.04em; }
.lab__class-text { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-muted); }
.lab__class-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 4.5rem; max-height: 7.6rem; overflow-y: auto; align-content: flex-start; justify-content: center; }
.lab__thumb {
  width: 4.6rem; height: 3.5rem; padding: 0; border: 1px solid var(--color-primary-dim); border-radius: 5px;
  overflow: hidden; cursor: pointer; background: #000; transition: transform 0.14s var(--ease-out);
  opacity: 0; transform: scale(0.9); animation: thumb-in 220ms var(--ease-out) forwards;
}
.lab__thumb:active { transform: scale(0.95); }
.lab__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lab__class-empty { align-self: center; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-muted); opacity: 0.6; }
@keyframes thumb-in { to { opacity: 1; transform: scale(1); } }

.lab__ghost {
  position: fixed; z-index: 95; width: 4.5rem; height: 3.4rem; margin: -1.7rem 0 0 -2.25rem;
  border: 2px solid var(--color-primary); border-radius: 8px; overflow: hidden; pointer-events: none;
  box-shadow: var(--glow-strong); transform: rotate(-3deg);
}
.lab__ghost img { width: 100%; height: 100%; object-fit: cover; display: block; }

.lab__verdict {
  position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem; text-align: center;
  background: rgba(3, 9, 6, 0.96); padding: 2rem; color: var(--color-primary); overflow-y: auto;
}
.lab__verdict-big { margin: 0; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: 0.05em; text-shadow: var(--glow-strong); }
.lab__verdict-sub { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); max-width: 34ch; }

.lab__head-right { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; justify-content: flex-end; }
.lab__done-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
.lab__done-hint { font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-muted); }
.lab__done { font-size: 1.2rem; }

/* Granska: kända prov */
.lab__review { flex: 1 1 auto; min-height: 200px; display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem; background: var(--color-background-2); overflow: hidden; }
.lab__review-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem 1rem; }
.lab__review-title { font-family: var(--font-retro); font-size: 1.3rem; letter-spacing: 0.06em; color: var(--color-primary); }
.lab__review-hint { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.lab__ref-cols { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
.lab__ref-col { display: flex; flex-direction: column; gap: 0.35rem; min-height: 0; }
.lab__ref-label { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: 1.1rem; letter-spacing: 0.04em; }
.lab__ref-row { flex: 1; min-height: 0; display: grid; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
.lab__ref { position: relative; min-height: 0; padding: 0; border: 1px solid var(--color-primary-dim); border-radius: 6px; overflow: hidden; background: #000; cursor: zoom-in; }
.lab__ref img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lab__ref-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 0.15rem 0.35rem; font-size: 0.7rem; color: var(--color-ink-strong); background: rgba(0, 0, 0, 0.6); text-align: left; }

/* Egen bild jämförd med kända prov */
.lab__cmp {
  position: fixed; inset: 0; z-index: 100; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto; gap: 1.2rem 1.6rem; padding: 3vmin; background: rgba(2, 6, 4, 0.95);
}
.lab__cmp-main, .lab__cmp-refs { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
.lab__cmp-label { font-size: 0.85rem; letter-spacing: 0.1em; color: var(--color-primary); }
.lab__cmp-img { flex: 1; min-height: 0; width: 100%; object-fit: contain; border: 1px solid var(--color-primary); box-shadow: var(--glow-strong); background: #000; }
.lab__cmp-refrow { flex: 1; min-height: 0; display: grid; grid-template-columns: 7.5rem repeat(3, minmax(0, 1fr)); gap: 0.4rem; align-items: stretch; padding: 0.35rem; border: 1px solid transparent; border-radius: 8px; opacity: 0.75; }
.lab__cmp-refrow--cur { border-color: var(--color-primary); opacity: 1; background: rgba(var(--mode-accent-rgb), 0.08); }
.lab__cmp-refname { font-family: var(--font-retro); font-size: 1rem; letter-spacing: 0.04em; color: var(--color-ink-strong); }
.lab__cmp-refrow img { width: 100%; height: 100%; min-height: 0; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-primary-dim); }
.lab__cmp-refname { align-self: center; }
.lab__cmp-actions { grid-column: 1 / -1; display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.cmp-enter-active { transition: opacity 180ms var(--ease-out); }
.cmp-leave-active { transition: opacity 140ms var(--ease-out); }
.cmp-enter-from, .cmp-leave-to { opacity: 0; }

/* Verdikt: misstänkta + människohår */
.lab__vd-persons { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; }
.lab__vd-person { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.4rem; background: var(--color-background-2); cursor: zoom-in; width: clamp(10rem, 19vw, 16rem); }
.lab__vd-person img { width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #000; border-radius: 4px; }
.lab__vd-name { font-family: var(--font-mono); font-size: 0.9rem; }
.lab__vd-label { font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.12em; color: var(--color-primary); margin-top: 0.4rem; }
.lab__vd-hair { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.lab__vd-hairimg { width: clamp(6rem, 11vw, 9rem); aspect-ratio: 4 / 3; padding: 0; border: 1px solid var(--color-primary); border-radius: 6px; overflow: hidden; background: #000; cursor: zoom-in; }
.lab__vd-hairimg img { width: 100%; height: 100%; object-fit: cover; display: block; }

.lab__lb-btn { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(1.2rem, 2.6vw, 1.8rem); padding: 0.8em 1.6em; min-width: 12rem; justify-content: center; }
.lab__lb-btn--del { color: var(--color-danger); border-color: var(--color-danger); }

@media (prefers-reduced-motion: reduce) {
  .lab__thumb { animation: none; opacity: 1; transform: none; }
}
</style>
