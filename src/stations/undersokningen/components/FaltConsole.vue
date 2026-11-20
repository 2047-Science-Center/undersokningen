<script setup lang="ts">
/**
 * FÄLTKONSOL (roll B). Split: fingeravtrycksyta (mock — klickbara spots) +
 * händelseloggen. Man UNDERSÖKER — klicka avtryck → övervakningsbild
 * ("IDENTIFIERAD SOM") som kryssas ner; smudge → ingen träff. Gissningen sker
 * först i slutet via LÄMNA SVAR (eller när timern går ut).
 *
 * Koppla innan man dömer (Maddes test 2026-11-20: de läste bara översta raden): efter en skanning
 * blir loggen en klicklista — "vilka rader handlar om den här personen?" — och först när personen
 * är kopplad (eller "syns inte i loggen") får man svara misstänkt / inte misstänkt. Klädorden i
 * loggen markeras medan man kopplar. Ingen rätt/fel-kontroll. Porträttet visas helt (ingen beskärning).
 */
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { klippKlader, tiderFor } from '../logg/logg'
import { LOG, asset } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { useUndersokningenStore } from '../store/undersokningenStore'
import Placeholder from './Placeholder.vue'
import Icon from './Icon.vue'
import Lightbox from './Lightbox.vue'
import CoachMarks from './CoachMarks.vue'
import MissionBox from './MissionBox.vue'

const store = useUndersokningenStore()
const { t } = useI18n()

const person = computed(() => store.activePerson)
const prints = computed(() => (person.value ? (store.state.scanCounts[person.value.id] ?? 0) : 0))
const activeSuspect = computed(() => (person.value ? store.isSuspect(person.value.id) : false))

const lightboxSrc = ref<string | null>(null)
const lightboxLabel = ref<string>('')
function openPhoto(p: { image: string; name?: string }): void {
  lightboxSrc.value = asset(p.image)
  lightboxLabel.value = p.name ?? ''
}
function decide(suspect: boolean): void {
  if (!person.value) return
  store.markSuspect(person.value.id, suspect)
  store.closePopup()
}

/* ---- koppla personen till loggen ---- */
/** Kopplingen som gäller för personen i popupen (null = inte kopplad än). */
const kopplat = computed(() => (person.value ? store.linksFor(person.value.id) : null))
/** Kopplingsläge: personen är inte kopplad än, eller man har tryckt "Ändra koppling". */
const andrar = ref(false)
const kopplar = computed(() => !!person.value && (kopplat.value == null || andrar.value))
/** Raderna man valt i loggen medan man kopplar. */
const valda = ref<number[]>([])
watch(
  () => person.value?.id,
  () => {
    andrar.value = false
    valda.value = [...(kopplat.value ?? [])]
  },
  { immediate: true },
)
function vaxlaRad(i: number): void {
  if (!kopplar.value) return
  valda.value = valda.value.includes(i) ? valda.value.filter((x) => x !== i) : [...valda.value, i].sort((a, b) => a - b)
  store.notifyActivity()
}
function koppla(rader: number[]): void {
  if (!person.value) return
  store.linkLog(person.value.id, rader)
  valda.value = [...rader]
  andrar.value = false
  // Visa de kopplade raderna i loggen (de kan ligga längre ner).
  void nextTick(() => document.querySelector('.falt__log-row--on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
}
function andraKoppling(): void {
  valda.value = [...(kopplat.value ?? [])]
  andrar.value = true
}
/** Raderna som lyses upp i loggen: valda (kopplar) eller personens koppling (bedömer). */
const markerade = computed(() => (kopplar.value ? valda.value : (kopplat.value ?? [])))
const loggBitar = LOG.entries.map((e) => klippKlader(e.text))

/* coach-marks (per sida, en gång vid live-start) */
const singleSide = computed(() => store.view !== 'shared')
const coachActive = ref(false)
let coachSeen = false
const coachSteps = computed(() => [
  { target: 'surface', title: t('coach.falt_scan_title'), text: t('coach.falt_scan_text') },
  { target: 'surface', title: t('coach.falt_read_title'), text: t('coach.falt_read_text') },
  { target: 'log', title: t('coach.falt_log_title'), text: t('coach.falt_log_text') },
  { target: 'suspects', title: t('coach.falt_mark_title'), text: t('coach.falt_mark_text') },
])
/** Coach-marks avstängda på FÄLT — den animerade rollgenomgången (pre-gate)
 *  täcker lyspenna/skanna/markera. Behålls i koden om vi vill slå på dem igen. */
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
  },
)
</script>

<template>
  <div class="falt">
    <header class="falt__head">
      <div class="falt__role">
        <Icon name="scanner" :size="26" />
        <div>
          <h2 class="falt__title">{{ t('falt.title') }}</h2>
          <p class="falt__sub">{{ t('role.falt') }} · {{ t('valv.nord') }}</p>
        </div>
      </div>
      <div class="falt__head-right">
        <MissionBox role="falt" />
        <div class="falt__submit-wrap">
          <span class="falt__submit-hint">{{ t('falt.submit_hint') }}</span>
          <button class="crt-button crt-button--strong falt__submit" @click="store.openVerdict()">
            {{ t('falt.submit') }} ▸
          </button>
        </div>
      </div>
    </header>

    <!-- Topppanel: misstänkta (klicka för helskärm) -->
    <section class="falt__suspects" data-coach="suspects">
      <span class="falt__suspects-title"><Icon name="person" :size="15" /> {{ t('falt.suspects_title') }}</span>
      <TransitionGroup name="susp" tag="div" class="falt__suspects-row">
        <button
          v-for="p in store.suspects" :key="p.id" class="falt__suspect" :title="t('falt.tap_fullscreen')"
          @click="openPhoto(p)"
        >
          <Placeholder class="falt__suspect-img" :path="p.image" :label="p.name || ''" />
          <span class="falt__suspect-tid mono">{{ tiderFor(store.linksFor(p.id)) ?? '' }}</span>
          <span v-if="store.hairMatch === p.id" class="falt__suspect-har mono">✓ hår (labbet)</span>
        </button>
      </TransitionGroup>
      <span v-if="!store.suspects.length" class="falt__suspects-empty">{{ t('falt.suspects_empty') }}</span>
    </section>

    <div class="falt__body">
      <!-- Fingeravtrycksyta -->
      <section class="falt__surface-wrap">
        <div class="falt__surface-head"><Icon name="finger" :size="16" /> {{ t('falt.surface') }}</div>
        <div class="falt__surface amber-frame" data-coach="surface">
          <span
            v-for="s in store.spotStatuses" :key="s.id"
            class="falt__spot" :class="{ 'falt__spot--scanned': s.scanned }"
            :style="{ left: s.x + '%', top: s.y + '%' }" aria-hidden="true"
          >
            <Icon name="finger" :size="26" />
          </span>
          <p class="falt__surface-hint">{{ t('falt.surface_hint') }}</p>

          <!-- Person-popup — täcker BARA avtrycksytan, loggen förblir läsbar/scrollbar -->
          <Transition name="pop">
            <div v-if="store.activeSpot" class="falt__popup" @click.self="store.closePopup()">
              <div class="falt__card amber-frame" :class="{ 'falt__card--person': !!person }">
                <button class="falt__x" :aria-label="t('common.close')" @click="store.closePopup()"><Icon name="close" :size="26" /></button>
                <template v-if="person">
                  <button class="falt__photo-btn" :title="t('falt.tap_photo')" @click="openPhoto(person)">
                    <Placeholder class="falt__photo" :path="person.image" :label="person.name" />
                  </button>
                  <div class="falt__id">
                    <span class="falt__id-eyebrow">{{ t('falt.identified_as') }}</span>
                    <span class="falt__id-name ink-strong">{{ person.name }}</span>
                    <span class="falt__id-clothing">{{ person.clothing }}</span>
                    <span class="falt__id-prints mono"><Icon name="finger" :size="22" /> {{ t('falt.prints_count', { n: prints }) }}</span>

                    <!-- 1) Koppla: vilka loggrader handlar om personen? -->
                    <template v-if="kopplar">
                      <p class="falt__link-q ink-strong">{{ t('falt.link_q', { name: person.name }) }}</p>
                      <p class="falt__match-hint">{{ t('falt.link_hint') }}</p>
                      <div class="falt__decide">
                        <button class="crt-button falt__decide-btn" @click="koppla([])">{{ t('falt.link_none') }}</button>
                        <button class="crt-button crt-button--strong falt__decide-btn" :disabled="!valda.length" @click="koppla(valda)">
                          {{ valda.length ? t('falt.link_done', { n: valda.length }) : t('falt.link_pick') }}
                        </button>
                      </div>
                    </template>

                    <!-- 2) Bedöm: först när personen är kopplad -->
                    <template v-else>
                    <p class="falt__linked mono">
                      {{ kopplat?.length ? t('falt.linked', { tider: tiderFor(kopplat) ?? '' }) : t('falt.link_none_done') }}
                      <button class="falt__link-change" @click="andraKoppling">{{ t('falt.link_change') }}</button>
                    </p>
                    <p class="falt__link-q ink-strong">{{ t('falt.judge_q', { name: person.name }) }}</p>
                    <div class="falt__decide">
                      <button class="crt-button falt__decide-btn" @click="decide(false)">{{ t('falt.not_suspect') }}</button>
                      <button
                        class="crt-button crt-button--strong falt__decide-btn falt__decide-btn--yes"
                        :class="{ 'falt__decide-btn--on': activeSuspect }" @click="decide(true)"
                      >
                        <Icon name="person" :size="18" /> {{ t('falt.suspect') }}
                      </button>
                    </div>
                    </template>
                  </div>
                </template>
                <div v-else class="falt__smudge">
                  <Icon name="exponering" :size="68" />
                  <h3 class="falt__smudge-title">{{ t('falt.smudge_title') }}</h3>
                  <p>{{ t('falt.smudge_body') }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </section>

      <!-- Händelselogg -->
      <section class="falt__log amber-frame" data-coach="log">
        <h3 class="falt__log-title"><Icon name="logg" :size="16" /> {{ t('falt.log_title') }}</h3>
        <p class="falt__log-head mono">{{ LOG.header }}</p>
        <ul class="falt__log-list" :class="{ 'falt__log-list--pick': kopplar }">
          <li v-for="(e, i) in LOG.entries" :key="i">
            <button
              type="button" class="falt__log-row"
              :class="{ 'falt__log-row--on': markerade.includes(i), 'falt__log-row--pick': kopplar }"
              :disabled="!kopplar" :aria-pressed="markerade.includes(i)" @click="vaxlaRad(i)"
            >
              <span class="falt__log-check" aria-hidden="true">{{ markerade.includes(i) ? '✓' : '' }}</span>
              <span class="falt__log-time mono">{{ e.time }}</span>
              <span class="falt__log-text">
                <template v-for="(b, k) in loggBitar[i]" :key="k"><mark v-if="b.klader && kopplar" class="falt__klader">{{ b.text }}</mark><template v-else>{{ b.text }}</template></template>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <CoachMarks :steps="coachSteps" :active="coachActive" @done="coachActive = false" />
    <Lightbox :src="lightboxSrc" :label="lightboxLabel" @close="lightboxSrc = null" />
  </div>
</template>

<style scoped>
.falt { display: flex; flex-direction: column; gap: 0.8rem; height: 100%; min-height: 0; position: relative; }
.falt__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.falt__role { display: flex; align-items: center; gap: 0.6rem; }
.falt__title { margin: 0; font-size: 1.5rem; letter-spacing: 0.06em; }
.falt__sub { margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-muted); }
.falt__head-right { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; justify-content: flex-end; }
.falt__submit-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
.falt__submit-hint { font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-muted); }
.falt__submit { font-size: 1.2rem; }
.falt__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1rem; }
.falt__surface-wrap { display: flex; flex-direction: column; gap: 0.6rem; min-height: 0; }
.falt__surface-head { display: flex; align-items: center; gap: 0.4rem; font-family: var(--font-retro); letter-spacing: 0.06em; color: var(--color-primary); }
.falt__surface {
  position: relative; flex: 1; min-height: 200px;
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(var(--mode-accent-rgb), 0.04) 38px 39px),
    var(--color-background-2);
}
/* Avtrycken = visuella markörer (ingen touch-fallback — scanning sker fysiskt). */
.falt__spot {
  position: absolute; transform: translate(-50%, -50%); pointer-events: none;
  color: var(--color-primary); opacity: 0.85; padding: 0.3rem;
  transition: color 0.14s var(--ease-out), opacity 0.14s var(--ease-out);
}
.falt__spot--scanned { color: var(--color-primary-dim); opacity: 0.35; }
.falt__surface-hint { position: absolute; left: 0; right: 0; bottom: 0.5rem; margin: 0; text-align: center; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-muted); pointer-events: none; }
.falt__log { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.8rem; min-height: 0; overflow: hidden; }
.falt__log-title { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-size: 1rem; letter-spacing: 0.06em; color: var(--color-primary); }
.falt__log-head { font-size: 0.72rem; color: var(--color-ink-muted); }
.falt__log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; }
.falt__log-list li { list-style: none; }
.falt__log-row {
  display: grid; grid-template-columns: 1.1em 3.2em 1fr; gap: 0.5rem; width: 100%; text-align: left;
  padding: 0.35rem 0.4rem; border: 1px solid transparent; border-radius: 6px; background: transparent; color: inherit; font: inherit;
  transition: background 0.14s var(--ease-out), border-color 0.14s var(--ease-out);
}
.falt__log-row:disabled { cursor: default; color: inherit; opacity: 1; }
.falt__log-row--pick { cursor: pointer; border-color: var(--color-primary-dim); }
.falt__log-row--pick:active { transform: scale(0.99); }
.falt__log-row--on { border-color: var(--color-primary); background: rgba(var(--mode-accent-rgb), 0.16); }
.falt__log-check { color: var(--color-primary); font-weight: 700; }
.falt__log-list--pick { gap: 0.35rem; }
.falt__klader { background: rgba(var(--mode-accent-rgb), 0.28); color: var(--color-ink-strong); border-radius: 3px; padding: 0 0.15em; }
.falt__link-q { margin: 0.5rem 0 0; font-size: clamp(1.1rem, 2.3vw, 1.5rem); line-height: 1.3; max-width: 30ch; }
.falt__linked { margin: 0.3rem 0 0; font-size: clamp(0.85rem, 1.7vw, 1.05rem); color: var(--color-primary); display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; justify-content: center; }
.falt__link-change { background: none; border: none; padding: 0; color: var(--color-ink-muted); text-decoration: underline; font: inherit; cursor: pointer; }
.falt__photo-btn { padding: 0; border: none; background: none; cursor: zoom-in; min-height: 0; display: flex; justify-content: center; }
/* Personkortet: porträttet till vänster i full höjd (kläderna syns), text + val till höger. */
.falt__card.falt__card--person { flex-direction: row; align-items: stretch; gap: clamp(0.8rem, 2vw, 1.6rem); padding-right: clamp(2.4rem, 4vw, 3rem); }
.falt__card--person .falt__photo-btn { flex: 1.1 1 0; min-width: 0; height: 100%; align-items: center; }
.falt__card--person .falt__photo { height: auto; max-height: 100%; }
.falt__card--person .falt__id { flex: 1 1 0; min-width: 0; overflow-y: auto; }
.falt__card--person .falt__id-name { font-size: clamp(1.7rem, 3.2vw, 2.6rem); }
.falt__log-time { color: var(--color-primary); }
.falt__log-text { font-family: var(--font-mono); font-size: 0.86rem; line-height: 1.35; }
/* Popupen täcker BARA avtrycksytan (ligger inuti .falt__surface) — loggen är kvar. */
.falt__popup { position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: rgba(3, 9, 6, 0.92); padding: 0.6rem; }
.falt__card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(0.6rem, 1.8vh, 1.3rem); padding: clamp(0.9rem, 2.4vh, 1.8rem); width: 100%; height: 100%; background: var(--color-background-2); overflow: hidden; }
.falt__x { position: absolute; top: 0.5rem; right: 0.5rem; z-index: 2; background: transparent; border: none; color: var(--color-ink-strong); cursor: pointer; padding: 0.5rem; display: inline-flex; border-radius: 50%; transition: transform 0.14s var(--ease-out); }
.falt__x:active { transform: scale(0.9); }
.falt__photo { width: 100%; max-width: 100%; height: 100%; align-self: center; }
/* Hela porträttet syns (kläderna = signalementet) — ingen beskärning. */
.falt__photo :deep(.ph__img) { object-fit: contain; background: #000; }
.falt__id { display: flex; flex-direction: column; gap: 0.45rem; justify-content: center; align-items: center; text-align: center; }
.falt__id-eyebrow { font-family: var(--font-mono); font-size: clamp(0.85rem, 1.6vw, 1.05rem); letter-spacing: 0.14em; color: var(--color-primary); }
.falt__id-name { font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.05; letter-spacing: 0.02em; }
.falt__id-clothing { font-family: var(--font-mono); font-size: clamp(1.1rem, 2.2vw, 1.5rem); color: var(--color-ink-muted); }
.falt__id-prints { display: inline-flex; align-items: center; gap: 0.45rem; font-size: clamp(1.1rem, 2.2vw, 1.45rem); color: var(--color-primary); margin-top: 0.4rem; }
.falt__smudge { display: flex; flex-direction: column; gap: 0.9rem; align-items: center; justify-content: center; text-align: center; padding: 1rem 1.5rem; color: var(--color-danger); }
.falt__smudge-title { margin: 0; font-size: clamp(1.8rem, 4vw, 2.6rem); letter-spacing: 0.06em; }
.falt__smudge p { margin: 0; font-size: clamp(1.1rem, 2.2vw, 1.5rem); max-width: 30ch; }

/* Topppanel: misstänkta */
.falt__suspects { flex: none; display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem 0.6rem; background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 8px; min-height: 3.6rem; }
.falt__suspects-title { display: inline-flex; align-items: center; gap: 0.35rem; font-family: var(--font-retro); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--color-primary); white-space: nowrap; }
.falt__suspects-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.falt__suspect-tid { display: block; font-size: 0.62rem; line-height: 1.2; color: var(--color-primary); padding: 0.1rem 0.2rem; white-space: nowrap; background: var(--color-background-2); }
.falt__suspect-har { display: block; font-size: 0.62rem; line-height: 1.3; color: var(--color-ink-strong); background: rgba(var(--mode-accent-rgb), 0.35); white-space: nowrap; }
.falt__suspect { width: 4.6rem; padding: 0; border: 1px solid var(--color-primary); border-radius: 6px; overflow: hidden; cursor: pointer; background: #000; transition: transform 0.14s var(--ease-out); }
.falt__suspect:active { transform: scale(0.95); }
.falt__suspect-img { width: 100%; height: 2.8rem; }
.falt__suspects-empty { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); opacity: 0.7; }
.susp-enter-active { transition: transform 240ms var(--ease-out), opacity 240ms var(--ease-out); }
.susp-enter-from { opacity: 0; transform: scale(0.9); }

/* Misstänkt-beslut i popupen */
.falt__match-hint { margin: 0.5rem 0 0; font-family: var(--font-mono); font-size: clamp(0.9rem, 1.8vw, 1.1rem); line-height: 1.35; color: var(--color-ink-muted); max-width: 32ch; }
.falt__decide { display: flex; gap: 0.6rem; margin-top: 0.7rem; }
.falt__decide-btn { font-size: clamp(1rem, 2vw, 1.25rem); padding: 0.6em 1em; }
.falt__decide-btn--yes { display: inline-flex; align-items: center; gap: 0.4rem; }
.falt__decide-btn--on { box-shadow: var(--glow-strong); }
/* Popup-entré: skala upp från 0.95 + opacity, stark ease-out (aldrig från 0). */
.pop-enter-active { transition: opacity 180ms var(--ease-out); }
.pop-enter-active .falt__card { transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out); }
.pop-leave-active { transition: opacity 140ms var(--ease-out); }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .falt__card { transform: scale(0.95); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .pop-enter-active .falt__card { transition: opacity 180ms ease; } .pop-enter-from .falt__card { transform: none; } }
</style>
