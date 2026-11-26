<script setup lang="ts">
/**
 * LABBETS PLATS 3 · RÖRPOSTEN (docs/STEGFLODE-FORSLAG.md §3.3 + §5, stillbild 7-haret-matchar.jpg).
 * Rörpostens utkast (mässingsrör + korg) i HÖGERKANTEN — fältet sitter till höger. I korgen ligger fältets
 * misstänkta som polaroider (store.suspects). Tryck en polaroid → den läggs stort på bordet bredvid de
 * etiketterade människohåren: "Vilket hår matchar <namn>?" → tryck ett hår → håret läggs på polaroiden →
 * stämpeln HÅRET MATCHAR (`stamp`) → store.matchHair(id) → kapseln skickas tillbaka TILL FÄLTET ▸ (`confirm`).
 * Matchningen kan ändras (annat hår / annan polaroid) eller tas bort (matchHair(null)).
 * labbPlats === 'klar' → samma bord men tydligt "✓ Skickat till fältet".
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { LOG, asset } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { LABB } from '../../../ljus'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import { LABB_TEXT as T, fargAv } from './labbText'
import { useLabbBord, manniskohar } from './labbBord'

const store = useUndersokningenStore()
const bord = useLabbBord()

const klar = computed(() => store.labbPlats === 'klar')
const harSorterade = computed(() => [...manniskohar.value].sort((a, b) => a.q.localeCompare(b.q)))

/** Polaroiden på bordet: den man tryckt på, annars den matchade, annars den enda som kommit. */
const valdId = computed<string | null>(() => {
  const ids = store.suspects.map((p) => p.id)
  if (bord.vald && ids.includes(bord.vald)) return bord.vald
  if (store.hairMatch && ids.includes(store.hairMatch)) return store.hairMatch
  return ids.length === 1 ? ids[0] : null
})
const vald = computed(() => store.suspects.find((p) => p.id === valdId.value) ?? null)
const valdMatchad = computed(() => !!vald.value && store.hairMatch === vald.value.id)
const matchadBild = computed(() => bord.bilder.find((b) => b.id === bord.matchBild) ?? null)
const fornamn = (namn: string) => namn.split(' ')[0]

/** Fältets inringade loggtider för personen ("14:10 · 14:24"), "" = inte kopplad än. */
const loggRad = computed(() => {
  if (!vald.value) return ''
  const rader = store.linksFor(vald.value.id)
  if (rader === null) return ''
  if (!rader.length) return T.rorpost.loggIngen
  return T.rorpost.logg(rader.map((i) => LOG.entries[i]?.time).filter(Boolean).join(' · '))
})

/* Stämpeln + kapseln tillbaka */
const stampNyckel = ref(0)
const skickar = ref(false)
const timers: ReturnType<typeof setTimeout>[] = []
function senare(fn: () => void, ms: number): void {
  timers.push(setTimeout(fn, ms))
}

function valjPolaroid(id: string): void {
  bord.vald = id
  audio.play('blip')
  store.notifyActivity()
}
function tryckHar(id: string): void {
  const p = vald.value
  if (!p) return
  bord.matchBild = id
  stampNyckel.value++
  audio.play('stamp')
  store.matchHair(p.id)
  senare(() => {
    audio.play('confirm')
    useLjus().gest('kvitto', [LABB], { tyst: true })
    skickar.value = true
  }, 650)
  senare(() => (skickar.value = false), 2300)
}
function taBortMatchning(): void {
  store.matchHair(null)
  bord.matchBild = null
  audio.play('nobuy')
}
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="rp">
    <header class="pl-huvud rp__huvud">
      <h2 class="pl-titel">{{ T.rorpost.titel }}</h2>
      <p class="pl-uppdrag">{{ klar ? T.rorpost.klarText : T.rorpost.uppdrag }}</p>
    </header>

    <div class="pl-bord rp__bord">
      <div class="rp__yta">
        <!-- Människohåren (etiketterade kort) -->
        <section class="rp__har">
          <button
            v-for="h in harSorterade" :key="h.id" type="button" class="rp__kort"
            :class="{ 'rp__kort--mal': !!vald, 'rp__kort--match': valdMatchad && bord.matchBild === h.id }"
            :disabled="!vald" @click="tryckHar(h.id)"
          >
            <img :src="h.src" alt="" draggable="false" />
            <span class="rp__kort-lapp">
              <i v-if="h.farg" :style="{ background: fargAv(h.farg)?.prick }" />{{ fargAv(h.farg)?.label ?? h.q }}
            </span>
            <span class="rp__kort-q">{{ h.q }}</span>
          </button>
          <p v-if="!harSorterade.length" class="rp__inget">{{ T.rorpost.inget }}</p>
        </section>

        <!-- Mitten: polaroiden på bordet -->
        <section class="rp__mitt">
          <div v-if="klar" class="rp__klar">{{ T.rorpost.klar }}</div>

          <template v-if="vald">
            <div class="rp__pol-yta">
              <figure :key="vald.id" class="pl-pol rp__pol">
                <img :src="asset(vald.image)" :alt="vald.name" />
                <figcaption class="pl-pol__cap">{{ vald.name.toUpperCase() }}</figcaption>
                <div v-if="valdMatchad && matchadBild" :key="'h' + matchadBild.id" class="rp__pol-har">
                  <img :src="matchadBild.src" alt="" />
                  <span>{{ fargAv(matchadBild.farg)?.label ?? matchadBild.q }}</span>
                </div>
                <span
                  v-if="valdMatchad" :key="'s' + stampNyckel"
                  class="pl-stamp pl-stamp--or rp__stamp" :class="{ 'pl-stamp--in': stampNyckel > 0 }"
                >{{ T.rorpost.stampel }}</span>
              </figure>
            </div>
            <p v-if="loggRad" class="rp__logg">{{ loggRad }}</p>
            <p class="rp__fraga">{{ valdMatchad ? T.rorpost.matchar(fornamn(vald.name)) : T.rorpost.fraga(fornamn(vald.name)) }}</p>
            <p class="rp__hjalp">{{ valdMatchad ? T.rorpost.andra : T.rorpost.tryckHar }}</p>
            <button v-if="valdMatchad" type="button" class="rp__tabort" @click="taBortMatchning">{{ T.rorpost.taBort }}</button>
          </template>
          <template v-else-if="store.suspects.length">
            <p class="rp__fraga">{{ T.rorpost.valj }}</p>
            <span class="rp__pil" aria-hidden="true">▸ ▸ ▸</span>
          </template>
          <template v-else>
            <p class="rp__fraga">{{ T.rorpost.vantar }}</p>
            <p class="rp__hjalp">{{ T.rorpost.vantarText }}</p>
          </template>
        </section>

        <!-- Rörpostens utkast i högerkanten: röret + korgen med polaroiderna -->
        <aside class="rp__ror" data-rorpost-korg>
          <div class="rp__tub" aria-hidden="true"><span class="rp__tub-mun" /></div>
          <div class="rp__korg">
            <span class="rp__korg-rubrik">{{ T.rorpost.misstankta(store.suspects.length) }}</span>
            <button
              v-for="(p, i) in store.suspects" :key="p.id" type="button" class="pl-pol rp__mini"
              :class="{ 'rp__mini--vald': p.id === valdId }" :style="{ rotate: (i % 2 ? 3 : -3) + 'deg' }"
              @click="valjPolaroid(p.id)"
            >
              <img :src="asset(p.image)" :alt="p.name" />
              <span class="pl-pol__cap">{{ fornamn(p.name) }}<template v-if="store.hairMatch === p.id"> ✓</template></span>
            </button>
          </div>
        </aside>
      </div>

      <!-- Kapseln skickas tillbaka till fältet -->
      <Transition name="rp-kapsel">
        <div v-if="skickar" class="rp__kapsel">
          <span class="rp__kapsel-ror" />
          <span class="rp__kapsel-text">{{ T.rorpost.tillFaltet }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.rp { position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.rp__huvud { flex-wrap: wrap; row-gap: 0.2rem; }
.rp__bord { container-type: inline-size; }
.rp__yta {
  height: 100%; display: grid; grid-template-columns: minmax(8rem, 0.8fr) minmax(0, 2fr) minmax(7.5rem, 0.7fr);
  gap: clamp(0.6rem, 2cqi, 2rem); padding: clamp(0.6rem, 2cqi, 1.6rem) 0 clamp(0.6rem, 2cqi, 1.6rem) clamp(0.6rem, 2cqi, 1.6rem);
}

/* Hårkorten */
.rp__har { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 0.8rem; padding: 0.3rem; }
.rp__kort {
  position: relative; flex: none; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.5rem 0.5rem 0.6rem;
  background: #dfe9e6; border: 3px solid transparent; border-radius: 6px; box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5); cursor: pointer;
  transition: transform 0.14s, border-color 0.14s;
}
.rp__kort:disabled { cursor: default; opacity: 0.8; }
.rp__kort:not(:disabled):active { transform: scale(0.97); }
.rp__kort img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 3px solid #1d1d1d; background: #000; }
.rp__kort-lapp {
  display: inline-flex; align-items: center; gap: 0.4em; padding: 0.15em 0.7em; background: #efe9da; color: #1d1d1d;
  font-family: var(--font-retro); font-size: clamp(0.95rem, 2cqi, 1.4rem); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.rp__kort-lapp i { width: 0.75em; height: 0.75em; border-radius: 50%; }
.rp__kort-q { position: absolute; top: 0.6rem; left: 0.7rem; padding: 0 0.3em; background: #efe9da; color: #1d1d1d; font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; }
.rp__kort--mal { border-style: dashed; border-color: var(--color-primary-dim); }
.rp__kort--match { border-style: solid; border-color: var(--color-primary); box-shadow: var(--glow-strong); }
.rp__inget { margin: 0; font-family: var(--font-mono); color: var(--color-ink-muted); }

/* Mitten */
.rp__mitt { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; }
.rp__pol-yta { flex: 0 1 auto; min-height: 0; width: min(100%, 30rem); display: flex; justify-content: center; }
.rp__pol { width: min(100%, 26rem); rotate: -1.5deg; animation: rp-lagg 420ms cubic-bezier(0.2, 1.2, 0.4, 1) both; }
.rp__pol img { aspect-ratio: 4 / 3; }
.rp__pol-har {
  position: absolute; right: -12%; bottom: -6%; width: 38%; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.35rem; background: #dfe9e6; box-shadow: 0 8px 18px rgba(0, 0, 0, 0.55); rotate: 4deg;
  animation: rp-lagg 360ms cubic-bezier(0.2, 1.2, 0.4, 1) both;
}
.rp__pol-har img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 2px solid #1d1d1d; }
.rp__pol-har span { font-family: var(--font-retro); font-size: clamp(0.8rem, 1.6cqi, 1.1rem); color: #1d1d1d; }
.rp__stamp { left: 8%; top: 34%; font-size: clamp(1.4rem, 4cqi, 2.8rem); }
@keyframes rp-lagg { from { opacity: 0; transform: translateX(30%) rotate(6deg) scale(0.9); } }
.rp__logg { margin: 0.6rem 0 0; font-family: var(--font-mono); font-size: clamp(0.85rem, 1.8cqi, 1.2rem); color: var(--color-ink-muted); }
.rp__fraga { margin: 0; font-family: var(--font-retro); font-size: clamp(1.3rem, 3.4cqi, 2.4rem); color: var(--color-ink-strong); }
.rp__hjalp { margin: 0; font-family: var(--font-mono); font-size: clamp(0.85rem, 1.8cqi, 1.2rem); color: var(--color-ink-muted); max-width: 36ch; }
.rp__pil { font-family: var(--font-retro); font-size: 2rem; color: var(--color-primary); letter-spacing: 0.2em; animation: rp-pil 1.2s ease-in-out infinite; }
@keyframes rp-pil { 50% { transform: translateX(10px); opacity: 0.6; } }
.rp__tabort {
  margin-top: 0.3rem; font-family: var(--font-mono); font-size: clamp(0.85rem, 1.6cqi, 1.05rem); color: var(--color-danger);
  background: transparent; border: 2px solid var(--color-danger); border-radius: 8px; padding: 0.35em 0.9em; cursor: pointer;
}
.rp__klar {
  position: absolute; top: 0; left: 50%; translate: -50% 0; z-index: 6; white-space: nowrap;
  padding: 0.3em 1em; border-radius: 10px; border: 3px solid var(--color-primary); background: rgba(5, 16, 11, 0.9);
  font-family: var(--font-retro); font-size: clamp(1.2rem, 3cqi, 2.1rem); color: var(--color-primary); box-shadow: var(--glow-strong);
}

/* Rörposten: mässingsrör från taket + trådkorg */
.rp__ror { position: relative; min-height: 0; display: flex; flex-direction: column; align-items: stretch; }
.rp__tub {
  position: relative; align-self: center; width: clamp(3rem, 8cqi, 4.6rem); height: clamp(4rem, 14cqi, 9rem); margin-top: calc(-1 * clamp(0.6rem, 2cqi, 1.6rem));
  border-radius: 0 0 40% 40% / 0 0 30% 30%;
  background: linear-gradient(90deg, #8a6a2a, #e6c46a 35%, #fbe7a4 50%, #c9a24a 70%, #7a5a20);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
}
.rp__tub-mun { position: absolute; left: 12%; right: 12%; bottom: 6%; height: 18%; border-radius: 50%; background: #1b140b; }
.rp__korg {
  flex: 1; min-height: 0; margin: 0.6rem 0.6rem 0 0; padding: 0.6rem 0.5rem; overflow-y: auto; display: flex; flex-direction: column; align-items: center; gap: 0.7rem;
  border: 3px solid rgba(220, 225, 230, 0.4); border-top-width: 5px; border-radius: 4px 4px 20px 20px;
  background: repeating-linear-gradient(90deg, rgba(220, 225, 230, 0.22) 0 2px, transparent 2px 14px);
}
.rp__korg-rubrik { font-family: var(--font-mono); font-size: clamp(0.75rem, 1.5cqi, 0.95rem); color: var(--color-ink-strong); background: rgba(0, 0, 0, 0.55); padding: 0.1em 0.5em; border-radius: 4px; }
.rp__mini { flex: none; width: 100%; max-width: 9rem; padding: 0.35rem 0.35rem 1.7rem; border: 3px solid transparent; cursor: pointer; transition: transform 0.14s; }
.rp__mini .pl-pol__cap { font-size: clamp(0.7rem, 1.5cqi, 0.95rem); bottom: 0.3rem; }
.rp__mini--vald { border-color: var(--color-primary); box-shadow: var(--glow-strong); }
.rp__mini:active { transform: scale(0.96); }

/* Kapseln åker tillbaka till fältet (högerkanten) */
.rp__kapsel {
  position: absolute; right: 1.2rem; top: 40%; z-index: 8; display: flex; align-items: center; gap: 0.8rem; pointer-events: none;
}
.rp__kapsel-ror {
  width: 7rem; height: 2.6rem; border-radius: 1.3rem;
  background: linear-gradient(180deg, #fbe7a4, #d8b45a 45%, #8a6a2a); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.55);
}
.rp__kapsel-text { order: -1; font-family: var(--font-retro); font-size: clamp(1.2rem, 3cqi, 2rem); color: var(--color-primary); text-shadow: var(--glow-strong); }
.rp-kapsel-enter-active { transition: transform 420ms cubic-bezier(0.2, 1.2, 0.4, 1), opacity 300ms; }
.rp-kapsel-leave-active { transition: transform 700ms cubic-bezier(0.55, 0, 0.9, 0.4), opacity 700ms; }
.rp-kapsel-enter-from { transform: scale(0.6); opacity: 0; }
.rp-kapsel-leave-to { transform: translateX(140%); opacity: 0; }

/* Halv bredd (#shared): smalare spalter */
@container (max-width: 1100px) {
  .rp__yta { grid-template-columns: minmax(6rem, 0.8fr) minmax(0, 1.6fr) minmax(6rem, 0.7fr); }
  .rp__pol-har { right: -4%; width: 34%; }
}
@media (prefers-reduced-motion: reduce) {
  .rp__pol, .rp__pol-har, .rp__pil { animation: none; }
}
</style>
