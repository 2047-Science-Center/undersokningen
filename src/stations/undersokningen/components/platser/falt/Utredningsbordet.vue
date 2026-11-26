<script setup lang="ts">
/**
 * FÄLTETS plats 2 · UTREDNINGSBORDET (docs/STEGFLODE-FORSLAG.md §3.2, stillbild 5-utredningsbordet.jpg).
 * En person i taget (`store.faltAktuell` = första obedömda i skanningsordning):
 *
 *   1) "Vilka rader handlar om Ravi?" → ringa in rader på pappersarket (LoggArk) → KOPPLA / SYNS INTE I LOGGEN
 *      (= store.linkLog). "ändra" ångrar kopplingen så länge personen inte är stämplad.
 *   2) "Är Ravi misstänkt?" → tryck på en STÄMPEL: MISSTÄNKT / AVSKRIVEN (= store.markSuspect, som spelar
 *      stämpelljudet). Stämpeln slår på polaroiden; MISSTÄNKT rullas ihop och sugs ut i rörposten
 *      ("◂ TILL LABBET"), AVSKRIVEN läggs åt sidan. Sedan glider nästa polaroid fram.
 *
 * Personen hålls lokalt (`hallen`) under stämpel-/rörpostfasen, eftersom `faltAktuell` byts direkt
 * när markSuspect gått igenom.
 */
import { computed, ref, watch, onUnmounted } from 'vue'
import { asset, personById, type Person } from '@/config'
import { tiderFor } from '../../../logg/logg'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import LoggArk from './LoggArk.vue'
import { FALT_TEXT, fornamn } from './faltText'

const T = FALT_TEXT.utredning
/** Stämpeln syns på polaroiden innan den åker iväg (ms). */
const STAMPEL_MS = 750
/** Rörposten / åt sidan (ms). */
const UT_MS = 1050

const store = useUndersokningenStore()

/* ---- personen på bordet ---- */
interface Hallen { person: Person; misstankt: boolean; fas: 'stampel' | 'ut' }
const hallen = ref<Hallen | null>(null)
const person = computed<Person | null>(() => hallen.value?.person ?? store.faltAktuell)
const avtryck = computed(() => (person.value ? (store.state.scanCounts[person.value.id] ?? 0) : 0))

/* ---- kön (alla skannade personer, i skanningsordning) ---- */
const ko = computed(() =>
  store.state.revealedPersonIds
    .map((id) => personById(id))
    .filter((p): p is Person => !!p)
    .map((p) => ({ person: p, bedomd: store.state.judged?.[p.id] as boolean | undefined })),
)
const koPlats = computed(() => {
  const i = person.value ? ko.value.findIndex((k) => k.person.id === person.value!.id) : -1
  return i >= 0 ? i + 1 : ko.value.length
})

/* ---- koppla: inringningar på arket ---- */
const kopplat = computed(() => (person.value ? store.linksFor(person.value.id) : null))
const andrar = ref(false)
const kopplar = computed(() => !!person.value && !hallen.value && (kopplat.value == null || andrar.value))
const valda = ref<number[]>([])
watch(
  () => person.value?.id,
  () => {
    andrar.value = false
    valda.value = [...(kopplat.value ?? [])]
  },
  { immediate: true },
)
/** Ringarna för personen på bordet: det man håller på att välja, annars personens koppling. */
const ringar = computed(() => (kopplar.value ? valda.value : (kopplat.value ?? [])))
/** Andra personers inringningar (ligger kvar tunnare på arket). */
const tidigare = computed(() => {
  const egen = person.value?.id
  const ut = new Set<number>()
  for (const [id, rader] of Object.entries(store.state.links ?? {})) if (id !== egen) rader.forEach((r) => ut.add(r))
  return [...ut]
})

function vaxla(i: number): void {
  if (!kopplar.value) return
  valda.value = valda.value.includes(i) ? valda.value.filter((x) => x !== i) : [...valda.value, i].sort((a, b) => a - b)
  store.notifyActivity()
}
function koppla(rader: number[]): void {
  if (!person.value || hallen.value) return
  store.linkLog(person.value.id, rader)
  valda.value = [...rader]
  andrar.value = false
}
function andra(): void {
  if (hallen.value) return
  valda.value = [...(kopplat.value ?? [])]
  andrar.value = true
}

/* ---- stämpla ---- */
let timers: ReturnType<typeof setTimeout>[] = []
function rensa(): void {
  timers.forEach(clearTimeout)
  timers = []
}
function stampla(misstankt: boolean): void {
  const p = person.value
  if (!p || hallen.value || kopplar.value) return
  hallen.value = { person: p, misstankt, fas: 'stampel' }
  store.markSuspect(p.id, misstankt) // stämpelljudet + (misstänkt) kvittoljuset sköts av storen
  timers.push(
    setTimeout(() => {
      if (hallen.value) hallen.value = { ...hallen.value, fas: 'ut' }
    }, STAMPEL_MS),
    setTimeout(() => {
      hallen.value = null
    }, STAMPEL_MS + UT_MS),
  )
}

watch(
  () => store.resetSignal,
  () => {
    rensa()
    hallen.value = null
  },
)
onUnmounted(rensa)

const suger = computed(() => hallen.value?.misstankt === true && hallen.value.fas === 'ut')
</script>

<template>
  <div class="utr">
    <header class="pl-huvud">
      <h2 class="pl-titel">{{ T.titel }}</h2>
      <p class="pl-uppdrag">{{ T.uppdrag }}</p>
    </header>

    <div class="pl-bord utr__bord">
      <!-- Rörposten i vänsterkanten (mot labbet) -->
      <div class="ror" :class="{ 'ror--suger': suger }" aria-hidden="true">
        <span class="ror__mun" />
      </div>
      <span class="ror__text" :class="{ 'ror__text--on': suger }">{{ T.tillLabbet }}</span>

      <!-- Vänster: polaroiden + frågan + kön -->
      <section class="utr__vanster">
        <div class="utr__polplats">
          <Transition name="utr-nasta">
            <div
              v-if="person" :key="person.id" class="pl-pol utr__pol"
              :class="{
                'utr__pol--ror': hallen?.fas === 'ut' && hallen.misstankt,
                'utr__pol--sidan': hallen?.fas === 'ut' && !hallen.misstankt,
              }"
            >
              <img :src="asset(person.image)" :alt="person.name" />
              <span class="pl-pol__cap">{{ person.name.toUpperCase() }}</span>
              <span
                v-if="hallen" class="pl-stamp pl-stamp--in utr__stamp"
                :class="{ 'pl-stamp--gra': !hallen.misstankt }"
              >{{ hallen.misstankt ? T.misstankt : T.avskriven }}</span>
            </div>
          </Transition>
        </div>

        <template v-if="person">
          <p class="utr__info">{{ person.clothing }} · {{ T.avtryck(avtryck) }}</p>

          <div class="utr__kort" :class="{ 'utr__kort--vila': !!hallen }">
            <!-- 1) Koppla -->
            <template v-if="kopplar">
              <p class="utr__fraga">{{ T.kopplaFraga(fornamn(person.name)) }}</p>
              <p class="utr__hint">{{ T.kopplaHint }}</p>
              <div class="utr__knappar">
                <button type="button" class="crt-button utr__knapp" @click="koppla([])">{{ T.synsInte }}</button>
                <button
                  type="button" class="crt-button crt-button--strong utr__knapp" :disabled="!valda.length"
                  @click="koppla(valda)"
                >{{ valda.length ? T.koppla(valda.length) : T.ringaIn }}</button>
              </div>
            </template>

            <!-- 2) Stämpla -->
            <template v-else>
              <p class="utr__kopplat">
                {{ kopplat?.length ? T.kopplat(tiderFor(kopplat) ?? '') : T.kopplatInget }}
                <button v-if="!hallen" type="button" class="utr__angra" @click="andra">{{ T.angra }}</button>
              </p>
              <p class="utr__fraga">{{ T.bedomFraga(fornamn(person.name)) }}</p>
              <div class="stamplar">
                <button type="button" class="stampknapp stampknapp--rod" :disabled="!!hallen" @click="stampla(true)">
                  <span class="stampknapp__handtag" aria-hidden="true" />
                  <span class="stampknapp__yta">{{ T.misstankt }}</span>
                </button>
                <button type="button" class="stampknapp stampknapp--gra" :disabled="!!hallen" @click="stampla(false)">
                  <span class="stampknapp__handtag" aria-hidden="true" />
                  <span class="stampknapp__yta">{{ T.avskriven }}</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- Kön: alla skannade, stämplade eller väntande -->
        <div class="ko">
          <div
            v-for="k in ko" :key="k.person.id" class="ko__pol"
            :class="{ 'ko__pol--nu': person?.id === k.person.id }"
          >
            <img :src="asset(k.person.image)" :alt="k.person.name" />
            <span
              v-if="k.bedomd !== undefined" class="ko__stamp"
              :class="k.bedomd ? 'ko__stamp--rod' : 'ko__stamp--gra'"
            >{{ k.bedomd ? T.misstankt : T.avskriven }}</span>
          </div>
          <span class="pl-raknare ko__raknare"><b>{{ koPlats }}</b> {{ T.koAv(ko.length) }}</span>
        </div>
      </section>

      <!-- Höger: loggen på pappersarket -->
      <section class="utr__hoger">
        <LoggArk :valda="ringar" :tidigare="tidigare" :kan-valja="kopplar" @vaxla="vaxla" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.utr { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; container: utr / inline-size; }
.utr .pl-titel { white-space: nowrap; }
.utr .pl-uppdrag { min-width: 0; }
.utr__bord {
  display: grid; grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.25fr); gap: clamp(0.8rem, 2.4cqi, 2rem);
  padding: clamp(0.7rem, 2cqi, 1.4rem) clamp(0.7rem, 2cqi, 1.4rem) clamp(0.7rem, 2cqi, 1.4rem) clamp(3rem, 6cqi, 4.6rem);
}
/* Halv bredd (#shared): arket får mer plats så att hela loggen ryms. */
@container utr (max-width: 1100px) {
  .utr__bord { grid-template-columns: minmax(0, 0.66fr) minmax(0, 1.34fr); gap: clamp(0.6rem, 1.6cqi, 1.2rem); }
}
@container utr (max-width: 640px) {
  .utr__bord { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
}

/* ---- rörposten ---- */
.ror {
  position: absolute; left: -4px; top: 22%; z-index: 3; width: clamp(2.1rem, 4cqi, 3.2rem); height: clamp(6rem, 16vh, 9.5rem);
  border-radius: 0 999px 999px 0;
  background: linear-gradient(90deg, #5e3f12, #b98a35 35%, #f1d38c 52%, #c9973e 70%, #6f4c18);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55), inset 0 0 0 2px rgba(60, 38, 8, 0.6);
  transition: box-shadow 250ms ease;
}
.ror__mun {
  position: absolute; right: 18%; top: 14%; bottom: 14%; width: 42%; border-radius: 999px;
  background: radial-gradient(ellipse at 40% 50%, #050302, #1c1207 70%, #3a2709);
  box-shadow: inset 2px 0 6px rgba(0, 0, 0, 0.9);
}
.ror--suger { box-shadow: 0 0 0 3px var(--color-primary), var(--glow-strong), 0 6px 16px rgba(0, 0, 0, 0.55); }
/* Etiketten står på högkant under röret (läses nedifrån och upp), så den inte krockar med polaroiden. */
.ror__text {
  position: absolute; left: clamp(0.35rem, 1cqi, 0.8rem); top: calc(22% + clamp(6rem, 16vh, 9.5rem) + 0.6rem); z-index: 3;
  writing-mode: vertical-rl; rotate: 180deg; letter-spacing: 0.12em;
  font-family: var(--font-mono); font-size: clamp(0.7rem, 1.2cqi, 0.95rem); color: var(--color-ink-muted); white-space: nowrap;
  transition: color 200ms ease;
}
.ror__text--on { color: var(--color-primary); text-shadow: var(--glow-soft); }

/* ---- vänster ---- */
.utr__vanster { container: vanster / inline-size; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: clamp(0.4rem, 1.2vh, 0.8rem); }
.utr__polplats { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.utr__pol { width: min(100%, 46vh); rotate: -1.2deg; transform-origin: left center; }
.utr__pol img { object-fit: contain; max-height: 34vh; }
.utr__stamp { left: 50%; top: 40%; translate: -50% -50%; font-size: clamp(1.7rem, 11cqi, 3.2rem); }

/* MISSTÄNKT: rullas ihop och sugs ut i rörposten till vänster. AVSKRIVEN: läggs åt sidan. */
.utr__pol--ror { animation: utr-ror 1000ms cubic-bezier(0.55, 0, 0.75, 0.3) forwards; }
.utr__pol--sidan { animation: utr-sidan 900ms cubic-bezier(0.4, 0, 0.6, 1) forwards; }
@keyframes utr-ror {
  0% { transform: none; opacity: 1; }
  35% { transform: scale(0.85, 0.5); border-radius: 40px; opacity: 1; }
  55% { transform: translateX(-20%) scale(0.32, 0.22); border-radius: 999px; opacity: 1; }
  100% { transform: translateX(-190%) scale(0.12, 0.1); border-radius: 999px; opacity: 0; }
}
@keyframes utr-sidan {
  to { transform: translate(18%, 55%) rotate(16deg) scale(0.45); opacity: 0; }
}
/* Nästa polaroid glider fram från höger. Den gamla har redan animerats bort. */
.utr-nasta-enter-active { transition: transform 480ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 480ms ease; }
.utr-nasta-enter-from { transform: translateX(45%) rotate(6deg); opacity: 0; }
.utr-nasta-leave-active { display: none; }

.utr__info { flex: none; margin: 0; font-family: var(--font-mono); font-size: clamp(0.9rem, 4cqi, 1.3rem); color: var(--color-primary); text-align: center; }

.utr__kort {
  flex: none; display: flex; flex-direction: column; gap: 0.45rem; padding: clamp(0.6rem, 3cqi, 1rem);
  border: 2px solid var(--color-primary-dim); border-radius: 10px; background: rgba(5, 12, 9, 0.82);
  transition: opacity 250ms ease;
}
.utr__kort--vila { opacity: 0.45; }
.utr__fraga { margin: 0; font-family: var(--font-retro); font-size: clamp(1.4rem, 8cqi, 2.6rem); line-height: 1.05; color: var(--color-ink-strong); }
.utr__hint { margin: 0; font-family: var(--font-mono); font-size: clamp(0.8rem, 3.4cqi, 1.05rem); color: var(--color-ink-muted); }
.utr__kopplat { margin: 0; display: flex; gap: 0.7rem; align-items: baseline; flex-wrap: wrap; font-family: var(--font-mono); font-size: clamp(0.85rem, 3.6cqi, 1.1rem); color: var(--color-primary); }
.utr__angra { background: none; border: none; padding: 0; font: inherit; color: var(--color-ink-muted); text-decoration: underline; cursor: pointer; }
.utr__knappar { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.utr__knapp { flex: 1 1 auto; font-size: clamp(0.9rem, 4cqi, 1.25rem); padding: 0.55em 0.9em; }

/* Stämplarna (gummistämpel: handtag + yta) */
.stamplar { display: flex; flex-wrap: wrap; gap: clamp(0.5rem, 4cqi, 1.6rem); justify-content: center; padding-top: 0.2rem; }
.stampknapp {
  display: flex; flex-direction: column; align-items: center; background: none; border: none; padding: 0; cursor: pointer;
  transition: transform 120ms ease;
}
.stampknapp:active:not(:disabled) { transform: translateY(4px) scale(0.97); }
.stampknapp:disabled { cursor: default; }
.stampknapp__handtag {
  width: 38%; height: clamp(1.3rem, 3.4vh, 2rem); border-radius: 999px 999px 6px 6px;
  background: linear-gradient(90deg, #3a2414, #7a4e2b 45%, #4a2e17); box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5);
}
.stampknapp__yta {
  margin-top: -2px; padding: 0.15em 0.6em 0.2em; border: 5px solid currentColor; border-radius: 8px; background: #efe9da;
  font-family: var(--font-retro); font-size: clamp(1.1rem, 7cqi, 2.4rem); letter-spacing: 0.04em; line-height: 1;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.45);
}
.stampknapp--rod { color: #d0241b; }
.stampknapp--gra { color: #6f6a60; }

/* Kön */
.ko { flex: none; display: flex; align-items: center; gap: clamp(0.35rem, 1cqi, 0.7rem); flex-wrap: wrap; }
.ko__pol {
  position: relative; width: clamp(3.2rem, 15cqi, 5.5rem); padding: 0.2rem 0.2rem 0.5rem; background: #f3eee2;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); opacity: 0.8;
}
.ko__pol:nth-child(odd) { rotate: -3deg; }
.ko__pol:nth-child(even) { rotate: 2deg; }
.ko__pol img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #111; }
.ko__pol--nu { opacity: 1; outline: 3px solid var(--color-primary); outline-offset: 2px; }
.ko__stamp {
  position: absolute; left: 50%; top: 42%; translate: -50% -50%; rotate: -12deg; padding: 0 0.25em;
  border: 2px solid currentColor; border-radius: 3px; background: rgba(243, 238, 226, 0.85);
  font-family: var(--font-retro); font-size: clamp(0.55rem, 2.8cqi, 0.9rem); line-height: 1.1; white-space: nowrap;
}
.ko__stamp--rod { color: #d0241b; }
.ko__stamp--gra { color: #6f6a60; }
.ko__raknare { margin-left: 0.3rem; font-size: clamp(1.3rem, 7cqi, 2.2rem); }

/* ---- höger ---- */
.utr__hoger { min-width: 0; min-height: 0; display: flex; }

@media (prefers-reduced-motion: reduce) {
  .utr__pol--ror, .utr__pol--sidan { animation: utr-ut-enkel 400ms ease forwards; }
  .utr-nasta-enter-active { transition: opacity 300ms ease; }
  .utr-nasta-enter-from { transform: none; }
  @keyframes utr-ut-enkel { to { opacity: 0; } }
}
</style>
