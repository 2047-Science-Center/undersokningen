<script setup lang="ts">
/**
 * LABBETS PLATS 2 · LJUSBORDET (docs/STEGFLODE-FORSLAG.md §3.3, stillbild 4-ljusbordet.jpg).
 * Människohåren ur MÄNNISKA-burken ligger i rad på ett ljusbord med sitt Q-nummer. Bredvid: en uppslagen
 * referensbok med kända människohår (REF_HAR.manniska) och ett ark färgetiketter MÖRKT · BLONT · RÖTT · GRÅTT.
 * Tryck etikett → tryck hår (eller tvärtom) → etiketten fäster (`confirm`). Ingen facit-kontroll.
 * Utvägen "Gå vidare ▸" efter UTVAG_EFTER_SEK.
 */
import { ref, computed } from 'vue'
import { REF_HAR, UTVAG_EFTER_SEK, asset } from '@/config'
import { audio } from '@/station-kit/audio/AudioEngine'
import { useLjus } from '@/station-kit/ljus'
import { LABB } from '../../../ljus'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import { LABB_TEXT as T, FARGER, fargAv, type Farg } from './labbText'
import { useLabbBord, manniskohar, etiketterade, satEtikett } from './labbBord'

const store = useUndersokningenStore()
useLabbBord()

const valdEtikett = ref<Farg | null>(null)
const valdHar = ref<string | null>(null)

const utvag = computed(() => {
  const start = store.state.startedAt
  return !!start && store.now - start >= UTVAG_EFTER_SEK * 1000
})

function fast(id: string, farg: Farg): void {
  satEtikett(id, farg)
  valdEtikett.value = null
  valdHar.value = null
  audio.play('confirm')
  useLjus().gest('kvitto', [LABB], { tyst: true })
  store.notifyActivity()
}
function tryckEtikett(f: Farg): void {
  if (valdHar.value) return fast(valdHar.value, f)
  valdEtikett.value = valdEtikett.value === f ? null : f
  store.notifyActivity()
}
function tryckHar(id: string): void {
  if (valdEtikett.value) return fast(id, valdEtikett.value)
  valdHar.value = valdHar.value === id ? null : id
  store.notifyActivity()
}
</script>

<template>
  <div class="lj">
    <header class="pl-huvud lj__huvud">
      <h2 class="pl-titel">{{ T.ljusbord.titel }}</h2>
      <p class="pl-uppdrag">{{ T.ljusbord.uppdrag }}</p>
    </header>

    <div class="pl-bord lj__bord">
      <div class="lj__yta">
        <!-- Ljusbordet -->
        <section class="lj__ljus">
          <div class="lj__rad">
            <button
              v-for="h in manniskohar" :key="h.id" type="button" class="lj__har"
              :class="{ 'lj__har--vald': valdHar === h.id, 'lj__har--mal': !!valdEtikett }"
              @click="tryckHar(h.id)"
            >
              <span class="lj__har-q">{{ h.q }}</span>
              <img class="lj__har-img" :src="h.src" alt="" draggable="false" />
              <span v-if="h.farg" class="lj__etikett lj__etikett--fast">
                <i :style="{ background: fargAv(h.farg)?.prick }" />{{ fargAv(h.farg)?.label }}
              </span>
              <span v-else class="lj__farg">{{ T.ljusbord.farg }}</span>
            </button>
            <p v-if="!manniskohar.length" class="lj__tomt">{{ T.ljusbord.tomt }}</p>
          </div>
          <div class="lj__fot">
            <span class="pl-raknare lj__raknare">{{ T.ljusbord.raknare }}: <b>{{ etiketterade.length }}</b> av {{ manniskohar.length }}</span>
            <span class="lj__hjalp">{{ valdHar ? T.ljusbord.hjalpHar : T.ljusbord.hjalp }}</span>
          </div>
        </section>

        <!-- Referensboken + etikettarket -->
        <div class="lj__sida">
          <section class="lj__bok">
            <span class="lj__bok-rubrik">{{ T.ljusbord.bok }}</span>
            <div class="lj__bok-uppslag">
              <figure v-for="r in REF_HAR.manniska" :key="r.image" class="lj__bok-prov">
                <img :src="asset(r.image)" :alt="r.label" />
                <figcaption>{{ r.label }}</figcaption>
              </figure>
            </div>
          </section>
          <section class="lj__ark">
            <span class="lj__ark-rubrik">{{ T.ljusbord.ark }}</span>
            <div class="lj__ark-grid">
              <button
                v-for="f in FARGER" :key="f.id" type="button" class="lj__etikett"
                :class="{ 'lj__etikett--vald': valdEtikett === f.id, 'lj__etikett--mal': !!valdHar }"
                @click="tryckEtikett(f.id)"
              ><i :style="{ background: f.prick }" />{{ f.label }}</button>
            </div>
          </section>
        </div>
      </div>
      <button v-if="utvag" type="button" class="pl-utvag lj__utvag" @click="store.gaVidare('ljusbord')">{{ T.utvag }}</button>
    </div>
  </div>
</template>

<style scoped>
.lj { position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.lj__huvud { flex-wrap: wrap; row-gap: 0.2rem; }
.lj__bord { container-type: inline-size; }
.lj__yta {
  height: 100%; display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(13rem, 1fr);
  gap: clamp(0.6rem, 2cqi, 2rem); padding: clamp(0.6rem, 2cqi, 1.6rem);
}

/* Ljusbordet: ljus panel med rutnät */
.lj__ljus {
  min-height: 0; display: flex; flex-direction: column; gap: 0.8rem; padding: clamp(0.7rem, 2cqi, 1.6rem);
  border-radius: 10px; border: 8px solid #3a3d3e;
  background-color: #dfe9e6;
  background-image:
    linear-gradient(rgba(60, 90, 85, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 90, 85, 0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  box-shadow: 0 0 40px rgba(220, 240, 235, 0.18), inset 0 0 30px rgba(255, 255, 255, 0.6);
}
.lj__rad {
  flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(8rem, 22cqi, 13rem), 1fr));
  gap: clamp(0.6rem, 1.6cqi, 1.4rem); align-content: start;
}
.lj__har {
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.4rem; cursor: pointer;
  background: transparent; border: 3px solid transparent; border-radius: 10px; transition: border-color 0.14s, transform 0.14s;
}
.lj__har:active { transform: scale(0.98); }
.lj__har-q { align-self: flex-start; font-family: var(--font-retro); font-size: clamp(1.2rem, 2.6cqi, 2rem); color: #1d1d1d; }
.lj__har-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 3px solid #1d1d1d; background: #000; }
.lj__har--mal { border-style: dashed; border-color: rgba(29, 29, 29, 0.35); }
.lj__har--vald { border-style: solid; border-color: var(--color-primary); box-shadow: var(--glow-soft); }
.lj__farg {
  padding: 0.3em 1.2em; border: 2px dashed rgba(29, 29, 29, 0.45); border-radius: 6px;
  font-family: var(--font-mono); font-size: clamp(0.9rem, 1.8cqi, 1.2rem); color: rgba(29, 29, 29, 0.6);
}
.lj__tomt { font-family: var(--font-mono); color: #1d1d1d; }
.lj__fot { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.4rem 1.4rem; }
.lj__raknare { color: #1d1d1d; }
.lj__hjalp { font-family: var(--font-mono); font-size: clamp(0.85rem, 1.6cqi, 1.1rem); color: rgba(29, 29, 29, 0.7); }

/* Etiketterna (på arket och fastsatta på håren) */
.lj__etikett {
  display: inline-flex; align-items: center; gap: 0.5em; padding: 0.35em 0.9em; cursor: pointer;
  font-family: var(--font-retro); font-size: clamp(1rem, 2.2cqi, 1.6rem); letter-spacing: 0.03em; color: #1d1d1d;
  background: #efe9da; border: 2px solid transparent; border-radius: 4px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  transition: transform 0.14s, border-color 0.14s;
}
.lj__etikett i { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; }
.lj__etikett--fast { cursor: inherit; animation: lj-fast 260ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.lj__etikett--mal { border-style: dashed; border-color: var(--color-primary-dim); }
.lj__etikett--vald { border-style: solid; border-color: var(--color-primary); transform: translateY(-4px) rotate(-2deg); box-shadow: var(--glow-strong); }
@keyframes lj-fast { from { opacity: 0; transform: scale(1.4) rotate(-6deg); } }

.lj__sida { min-height: 0; display: flex; flex-direction: column; gap: clamp(0.6rem, 2cqi, 1.4rem); }
/* Referensboken: ett uppslag */
.lj__bok {
  flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.8rem; color: #1d1d1d;
  background: #efe9da; border-left: 6px solid #8f8774;
  border-radius: 4px; box-shadow: 0 12px 26px rgba(0, 0, 0, 0.55);
}
.lj__bok-rubrik, .lj__ark-rubrik { font-family: var(--font-mono); font-weight: 600; letter-spacing: 0.14em; font-size: clamp(0.8rem, 1.6cqi, 1rem); }
.lj__ark-rubrik { color: var(--color-primary); }
.lj__bok-uppslag { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; align-content: start; overflow: hidden; }
.lj__bok-prov { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; min-height: 0; }
.lj__bok-prov img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 1px solid #8f8774; }
.lj__bok-prov figcaption { font-family: var(--font-mono); font-size: clamp(0.75rem, 1.4cqi, 0.95rem); text-align: center; }
.lj__ark { display: flex; flex-direction: column; gap: 0.5rem; }
.lj__ark-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
.lj__ark-grid .lj__etikett { justify-content: flex-start; }

.lj__utvag { position: absolute; right: 1rem; bottom: 1rem; z-index: 4; }

/* Halv bredd (#shared): ljusbordet överst, bok + etiketter bredvid varandra under */
@container (max-width: 1100px) {
  .lj__yta { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr); }
  .lj__sida { flex-direction: row; }
  .lj__bok, .lj__ark { flex: 1; min-width: 0; }
  .lj__ark-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .lj__etikett--fast { animation: none; } }
</style>
