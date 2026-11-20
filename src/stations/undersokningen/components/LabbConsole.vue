<script setup lang="ts">
/**
 * LABBKONSOL (roll A). Mikroskopet överst; operatören FRYSER ett hårstrå →
 * stillbild → DRAR den till en av tre hårkategori-containrar. Placerade bilder
 * kan öppnas i helskärm: TILLBAKA (ingen ändring) eller TA BORT BILDEN (ångra en
 * sortering och skanna/sortera om). Coach-marks introducerar uppdraget vid live-start.
 *
 * Maddes test 2026-11-20 (labbet blev klart långt före fältet) → labbets ANDRA uppgift:
 * "FÄLTETS MISSTÄNKTA" fylls på live när fältet markerar någon. Labbet jämför sina människohår med
 * de misstänkta och markerar EN matchning (hår ↔ misstänkt), som synkas till fältet. En egen bild i
 * helskärm visar också kända prov (REF_HAR) som stöd när man flyttar den mellan korgarna.
 *
 * Bilderna är LOKALA för labb-fönstret (skickas aldrig över reläet — tungt).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { HAIR_CLASSES, REF_HAR, asset, type HairClassId } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { LABB } from '../ljus'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Microscope from './Microscope.vue'
import Icon from './Icon.vue'
import CoachMarks from './CoachMarks.vue'
import MissionBox from './MissionBox.vue'

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
/* ---- fältets misstänkta: jämför människohåren och markera EN matchning ---- */
const manniskohar = computed(() => placedIn('manniska'))
/** Senast inkomna misstänkta pulserar en stund (fältet har just markerat hen). */
const ny = ref<string | null>(null)
let nyTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.suspects.map((p) => p.id),
  (nu, fore) => {
    const tillkom = nu.find((id) => !(fore ?? []).includes(id))
    if (!tillkom || !fore) return
    ny.value = tillkom
    audio.play('popup')
    if (nyTimer) clearTimeout(nyTimer)
    nyTimer = setTimeout(() => (ny.value = null), 2600)
  },
)
/** Misstänkt som jämförs just nu (helskärm) + vald hårbild i jämförelsen. */
const jamfor = ref<string | null>(null)
const jamforPerson = computed(() => store.suspects.find((p) => p.id === jamfor.value) ?? null)
const valdBild = ref<string | null>(null)
/** Vilken av labbets bilder matchningen gjordes med (lokalt — bilderna lämnar inte labbet). */
const matchBild = ref<string | null>(null)
function oppnaJamfor(id: string): void {
  jamfor.value = id
  valdBild.value = store.hairMatch === id ? matchBild.value : null
  store.notifyActivity()
}
function matcha(): void {
  if (!jamfor.value || !valdBild.value) return
  store.matchHair(jamfor.value)
  matchBild.value = valdBild.value
  jamfor.value = null
  audio.play('confirm')
  useLjus().gest('kvitto', [LABB], { tyst: true })
}
function avmatcha(): void {
  store.matchHair(null)
  matchBild.value = null
  jamfor.value = null
  audio.play('nobuy')
}
const matchadBildSrc = computed(() => placed.value.find((p) => p.id === matchBild.value)?.src ?? null)
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
    jamfor.value = null
    valdBild.value = null
    matchBild.value = null
    ny.value = null
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
      <MissionBox role="labb" />
    </header>

    <div class="lab__mid">
      <Microscope ref="scopeRef" class="lab__scope" data-coach="scope" @capture="onCapture" @grab="onGrab" />

      <!-- FÄLTETS MISSTÄNKTA (live): jämför människohåren med dem, markera EN matchning -->
      <aside class="lab__susp amber-frame">
        <span class="lab__susp-title"><Icon name="person" :size="16" /> {{ t('lab.susp_title') }}</span>
        <p class="lab__susp-hint">{{ store.suspects.length ? t('lab.susp_hint') : t('lab.susp_empty') }}</p>
        <div class="lab__susp-list">
          <button
            v-for="p in store.suspects" :key="p.id" class="lab__susp-card"
            :class="{ 'lab__susp-card--ny': ny === p.id, 'lab__susp-card--match': store.hairMatch === p.id }"
            @click="oppnaJamfor(p.id)"
          >
            <img :src="asset(p.image)" :alt="p.name" />
            <span class="lab__susp-name ink-strong">{{ p.name }}</span>
            <span v-if="store.hairMatch === p.id" class="lab__susp-tag mono">
              <img v-if="matchadBildSrc" :src="matchadBildSrc" alt="" class="lab__susp-hair" />✓ {{ t('lab.match_tag') }}
            </span>
            <span v-else class="lab__susp-cta mono">{{ t('lab.match_cta') }}</span>
          </button>
        </div>
      </aside>
    </div>

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

    <!-- Vid verdikt: fältet pekar ut tjuven (labbets matchning syns där) -->
    <div v-if="verdicting && !jamfor" class="lab__verdict">
      <Icon name="person" :size="48" />
      <p class="lab__verdict-big">{{ t('lab.answer_other') }}</p>
      <p class="lab__verdict-sub">
        {{ store.hairMatch ? t('lab.verdict_match', { name: store.suspects.find((p) => p.id === store.hairMatch)?.name ?? '' }) : t('lab.help_other') }}
      </p>
      <button v-if="store.suspects.length" class="crt-button lab__verdict-btn" @click="oppnaJamfor(store.hairMatch ?? store.suspects[0].id)">{{ t('lab.verdict_change') }}</button>
    </div>

    <!-- Jämför: en misstänkt (helskärm) bredvid labbets människohår → markera matchning -->
    <Transition name="cmp">
      <div v-if="jamforPerson" class="lab__cmp lab__cmp--match" @click.self="jamfor = null">
        <div class="lab__cmp-main">
          <span class="lab__cmp-label mono">{{ t('lab.susp_title') }} · {{ jamforPerson.name }}</span>
          <img class="lab__cmp-img" :src="asset(jamforPerson.image)" :alt="jamforPerson.name" />
          <div class="lab__susp-nav">
            <button
              v-for="p in store.suspects" :key="p.id" class="lab__susp-chip" :class="{ 'lab__susp-chip--on': p.id === jamfor }"
              @click="oppnaJamfor(p.id)"
            >{{ p.name }}<span v-if="store.hairMatch === p.id"> ✓</span></button>
          </div>
        </div>
        <div class="lab__cmp-refs">
          <span class="lab__cmp-label mono">{{ t('lab.verdict_hair') }} — {{ t('lab.match_pick') }}</span>
          <div class="lab__match-grid">
            <button
              v-for="h in manniskohar" :key="h.id" class="lab__match-img"
              :class="{ 'lab__match-img--on': valdBild === h.id }" @click="valdBild = h.id"
            ><img :src="h.src" alt="" /></button>
            <p v-if="!manniskohar.length" class="lab__class-empty">{{ t('lab.verdict_none_hair') }}</p>
          </div>
        </div>
        <div class="lab__cmp-actions">
          <button class="crt-button lab__lb-btn" @click="jamfor = null">{{ t('lab.photo_back') }}</button>
          <button class="crt-button crt-button--strong lab__lb-btn" :disabled="!valdBild" @click="matcha">
            {{ t('lab.match_do', { name: jamforPerson.name.toUpperCase() }) }}
          </button>
          <button v-if="store.hairMatch === jamforPerson.id" class="crt-button lab__lb-btn lab__lb-btn--del" @click="avmatcha">
            <Icon name="close" :size="22" /> {{ t('lab.match_undo') }}
          </button>
        </div>
      </div>
    </Transition>

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

  </div>
</template>

<style scoped>
.lab { display: flex; flex-direction: column; gap: 0.6rem; height: 100%; min-height: 0; position: relative; }
.lab__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.lab__role { display: flex; align-items: center; gap: 0.7rem; }
.lab__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.lab__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }

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

/* Mikroskop + fältets misstänkta bredvid */
.lab__mid { flex: 1 1 auto; min-height: 200px; display: grid; grid-template-columns: minmax(0, 1fr) clamp(13rem, 24%, 20rem); gap: 0.7rem; }
.lab__mid .lab__scope { min-height: 0; }
.lab__susp { display: flex; flex-direction: column; gap: 0.4rem; min-height: 0; padding: 0.6rem; background: var(--color-background-2); }
.lab__susp-title { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: 1rem; letter-spacing: 0.08em; color: var(--color-primary); }
.lab__susp-hint { margin: 0; font-family: var(--font-mono); font-size: 0.78rem; line-height: 1.35; color: var(--color-ink-muted); }
.lab__susp-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.lab__susp-card {
  display: grid; grid-template-columns: 5.2rem 1fr; grid-template-rows: auto auto; gap: 0.1rem 0.5rem; align-items: center;
  padding: 0.35rem; text-align: left; color: inherit; background: var(--color-background); cursor: pointer;
  border: 1px solid var(--color-primary-dim); border-radius: 8px; transition: border-color 0.14s var(--ease-out), transform 0.14s var(--ease-out);
}
.lab__susp-card:active { transform: scale(0.98); }
.lab__susp-card img { grid-row: 1 / 3; width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #000; border-radius: 4px; }
.lab__susp-name { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; }
.lab__susp-cta { font-size: 0.72rem; color: var(--color-primary); }
.lab__susp-tag { font-size: 0.75rem; color: var(--color-ink-strong); background: rgba(var(--mode-accent-rgb), 0.3); border-radius: 4px; padding: 0 0.3em; justify-self: start; }
.lab__susp-tag { display: inline-flex; align-items: center; gap: 0.3rem; }
.lab__susp-hair { width: 2.2rem; height: 1.6rem; object-fit: cover; border-radius: 3px; }
.lab__susp-card--match { border-color: var(--color-primary); box-shadow: var(--glow-soft); }
.lab__susp-card--ny { animation: susp-ny 0.9s ease-in-out 3; border-color: var(--color-primary); }
@keyframes susp-ny { 50% { box-shadow: var(--glow-strong); transform: scale(1.03); } }
@media (prefers-reduced-motion: reduce) { .lab__susp-card--ny { animation: none; } }

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

/* Matchning: en misstänkt bredvid labbets människohår */
.lab__susp-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.lab__susp-chip { font-family: var(--font-mono); font-size: 0.9rem; padding: 0.35em 0.8em; border-radius: 999px; border: 1px solid var(--color-primary-dim); background: var(--color-background-2); color: var(--color-ink-muted); cursor: pointer; }
.lab__susp-chip--on { border-color: var(--color-primary); color: var(--color-ink-strong); }
.lab__match-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-content: start; }
.lab__match-img { padding: 0; aspect-ratio: 4 / 3; border: 2px solid var(--color-primary-dim); border-radius: 8px; overflow: hidden; background: #000; cursor: pointer; }
.lab__match-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lab__match-img--on { border-color: var(--color-primary); box-shadow: var(--glow-strong); }
.lab__verdict-btn { margin-top: 0.6rem; font-size: 1.1rem; }
.lab__lb-btn { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(1.2rem, 2.6vw, 1.8rem); padding: 0.8em 1.6em; min-width: 12rem; justify-content: center; }
.lab__lb-btn--del { color: var(--color-danger); border-color: var(--color-danger); }

@media (prefers-reduced-motion: reduce) {
  .lab__thumb { animation: none; opacity: 1; transform: none; }
}
</style>
