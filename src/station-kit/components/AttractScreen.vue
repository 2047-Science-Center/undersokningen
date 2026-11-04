<script setup lang="ts">
/**
 * Attract/boot-skärm. Två lägen:
 *  - ROLLBILD (image satt + laddas): full-bleed rollbild + rolletikett + uppdrag
 *    + "tryck för att börja". Varje skärm visar sin egen roll.
 *  - FALLBACK (ingen bild / fil saknas): stationstitel + tagline + uppdrag.
 * Första användargesten låser upp ljudkontexten (kiosk-autoplay) + boot-ljud.
 */
import { ref, computed } from 'vue'
import { audio } from '../audio/AudioEngine'
import { useI18n } from '../i18n'
import Teletype from './Teletype.vue'

const emit = defineEmits<{ start: [] }>()
const props = defineProps<{ mission?: string; image?: string; role?: string }>()
const { t } = useI18n()
const booting = ref(false)
const imgFailed = ref(false)
const showImage = computed(() => !!props.image && !imgFailed.value)

function begin() {
  if (booting.value) return
  booting.value = true
  audio.unlock()
  audio.play('boot')
  setTimeout(() => emit('start'), 900)
}
</script>

<template>
  <div class="attract" :class="{ 'attract--image': showImage }" @click="begin">
    <!-- Rollbild (full-bleed) -->
    <img
      v-if="props.image && !imgFailed" class="attract__bg" :src="props.image" alt=""
      @error="imgFailed = true"
    />
    <div v-if="showImage" class="attract__scrim" aria-hidden="true" />

    <div class="attract__content">
      <h1 class="attract__title ink-strong">{{ t('app.title') }}</h1>

      <!-- Rollrad för den här skärmen (annars kitets subtitel + tagline) -->
      <p v-if="role" class="attract__roleline">Ni är <span class="ink-strong">{{ role }}</span></p>
      <template v-else>
        <p class="attract__sub">{{ t('app.subtitle') }}</p>
        <Teletype class="attract__tag" :text="t('attract.tagline')" :speed="30" />
      </template>

      <p v-if="mission" class="attract__mission">
        <span class="attract__mission-label">UPPDRAG</span>
        <span class="attract__mission-text">{{ mission }}</span>
      </p>

      <p v-if="!booting" class="attract__cta crt-caret">{{ t('common.press_to_start') }}</p>
      <p v-else class="attract__cta">{{ t('attract.boot') }}</p>
    </div>
  </div>
</template>

<style scoped>
.attract {
  position: relative; display: flex; align-items: center; justify-content: center;
  height: 100%; text-align: center; cursor: pointer; overflow: hidden;
}
.attract__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.attract__scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(2, 8, 5, 0.45) 0%, rgba(2, 8, 5, 0.25) 45%, rgba(2, 8, 5, 0.85) 100%);
}
.attract__content {
  position: relative; z-index: 2; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: clamp(1.2rem, 3vh, 2rem);
  padding: clamp(1rem, 4vh, 3rem);
}
.attract--image .attract__content { justify-content: flex-end; height: 100%; gap: clamp(0.8rem, 2vh, 1.4rem); padding-bottom: clamp(2rem, 7vh, 5rem); }
.attract__title { font-size: clamp(3rem, 10vw, 7rem); margin: 0; letter-spacing: 0.1em; }
.attract__sub { color: var(--color-primary); font-size: 1.4rem; margin: 0.3rem 0 0; letter-spacing: 0.3em; }
.attract__tag { max-width: 40ch; color: var(--color-primary); }
.attract__roleline {
  margin: 0; font-family: var(--font-mono); font-size: clamp(1.4rem, 3.2vw, 2.2rem); letter-spacing: 0.04em;
  color: var(--color-ink-strong);
}
.attract__roleline .ink-strong { color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.1em; }
.attract__mission {
  display: inline-flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; justify-content: center;
  margin: 0; max-width: 46ch;
}
.attract__mission-label {
  font-family: var(--font-retro); font-size: clamp(0.8rem, 1.6vw, 1rem); letter-spacing: 0.14em;
  color: var(--color-primary); border: 1px solid var(--color-primary-dim); border-radius: 999px; padding: 0.15em 0.7em;
}
.attract__mission-text { font-family: var(--font-mono); font-size: clamp(1rem, 2.2vw, 1.4rem); color: var(--color-ink-strong); }
.attract__cta { font-size: clamp(1.2rem, 2.4vw, 1.7rem); color: var(--color-ink-strong); letter-spacing: 0.1em; margin: 0; }
</style>
