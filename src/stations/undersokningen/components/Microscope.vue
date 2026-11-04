<script setup lang="ts">
/**
 * Dino-Lite-vy (labb-sidan). USB-webbkamera, väljs automatiskt på namnet
 * (config.cameraLabel). EN stor FRYS-knapp fångar videorutan till en stillbild
 * (emit 'capture') + pausar bilden; knappen blir GÅ TILLBAKA som återupptar
 * live. När bilden är fryst drar man DIREKT från den (pointerdown → emit
 * 'grab') ner i en hårkategori. `release()` exponeras så labbkonsolen kan
 * återgå till live efter att provet sorterats.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { config } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import { audio } from '@/station-kit/audio/AudioEngine'
import Icon from './Icon.vue'

const { t } = useI18n()
const emit = defineEmits<{ capture: [string]; grab: [PointerEvent] }>()

const video = ref<HTMLVideoElement | null>(null)
const msg = ref<string>('')
const frozen = ref(false)
const cameras = ref<MediaDeviceInfo[]>([])
const currentId = ref<string>('')
let stream: MediaStream | null = null
let canvas: HTMLCanvasElement | null = null

function pickDevice(devices: MediaDeviceInfo[]): string | undefined {
  const needle = config.cameraLabel.toLowerCase()
  const match = devices.find((d) => d.label.toLowerCase().includes(needle))
  return (match ?? devices[0])?.deviceId
}

async function listCameras(): Promise<MediaDeviceInfo[]> {
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
  cameras.value = devices
  return devices
}

async function start(deviceId?: string): Promise<MediaDeviceInfo[] | undefined> {
  if (stream) stream.getTracks().forEach((tr) => tr.stop())
  frozen.value = false
  msg.value = t('mikroskop.opening')
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { width: { ideal: 1920 }, height: { ideal: 1080 } },
    })
    if (video.value) {
      video.value.srcObject = stream
      void video.value.play().catch(() => {})
    }
    msg.value = ''
    const track = stream.getVideoTracks()[0]
    currentId.value = track?.getSettings().deviceId ?? deviceId ?? ''
    return await listCameras()
  } catch (err) {
    const e = err as DOMException
    msg.value = `${t('mikroskop.failed')} (${e.name})`
    return undefined
  }
}

function onPick(e: Event): void {
  const id = (e.target as HTMLSelectElement).value
  if (id) void start(id)
}

/** Rita aktuell videoruta till canvas → dataURL. */
function captureFrame(): string | null {
  const v = video.value
  if (!v || !v.videoWidth) return null
  if (!canvas) canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

function toggleFreeze(): void {
  frozen.value = !frozen.value
  audio.play(frozen.value ? 'stamp' : 'blip')
  if (!video.value) return
  if (frozen.value) {
    video.value.pause()
    const data = captureFrame()
    if (data) emit('capture', data)
  } else {
    void video.value.play()
  }
}

/** Återgå till live (anropas utifrån efter att provet sorterats). */
function release(): void {
  if (frozen.value) toggleFreeze()
}
defineExpose({ release })

/** Fryst bild = dra direkt från den. */
function onStagePointerDown(e: PointerEvent): void {
  if (frozen.value && !msg.value) emit('grab', e)
}

onMounted(async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    msg.value = t('mikroskop.unsupported')
    return
  }
  const devices = await start()
  if (devices && devices.length) {
    const want = pickDevice(devices)
    if (want && want !== currentId.value) await start(want)
  }
})

onBeforeUnmount(() => {
  if (stream) stream.getTracks().forEach((tr) => tr.stop())
})
</script>

<template>
  <div class="scope amber-frame">
    <div class="scope__head">
      <Icon name="mikroskop" :size="18" />
      <span class="scope__title">{{ t('mikroskop.title') }}</span>
      <select v-if="cameras.length > 1" class="scope__cam" :value="currentId" @change="onPick">
        <option v-for="(c, i) in cameras" :key="c.deviceId" :value="c.deviceId">
          {{ c.label || ('Kamera ' + (i + 1)) }}
        </option>
      </select>
    </div>
    <div
      class="scope__stage" :class="{ 'scope__stage--frozen': frozen, 'scope__stage--grab': frozen && !msg }"
      @pointerdown.prevent="onStagePointerDown"
    >
      <video ref="video" class="scope__video" autoplay playsinline muted />
      <div v-if="msg" class="scope__msg">
        <Icon name="mikroskop" :size="34" />
        <span>{{ msg }}</span>
        <span class="scope__hint">{{ t('mikroskop.allow') }}</span>
      </div>
      <span v-if="frozen && !msg" class="scope__frozen-tag"><Icon name="check" :size="13" /> FRYST</span>
      <!-- Dra-affordans: syns på den frysta bilden -->
      <div v-if="frozen && !msg" class="scope__draghint" aria-hidden="true">
        <span class="scope__draghint-text">{{ t('mikroskop.drag_hint') }}</span>
        <span class="scope__arrows"><span>▼</span><span>▼</span><span>▼</span></span>
      </div>
    </div>
    <div class="scope__tools">
      <button class="scope__btn scope__btn--freeze" :class="{ 'scope__btn--on': frozen }" @click="toggleFreeze">
        <Icon :name="frozen ? 'check' : 'exponering'" :size="26" />
        {{ frozen ? t('mikroskop.release') : t('mikroskop.freeze') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scope { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.scope__head { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--color-primary-dim); }
.scope__title { font-family: var(--font-retro); letter-spacing: 0.08em; color: var(--color-primary); }
.scope__cam {
  margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-muted);
  background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 6px;
  padding: 0.1em 0.4em; max-width: 12rem;
}
.scope__stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; }
.scope__stage--frozen { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.scope__stage--grab { cursor: grab; touch-action: none; }
.scope__stage--grab:active { cursor: grabbing; }
.scope__video { max-width: 100%; max-height: 100%; display: block; pointer-events: none; }
.scope__msg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; padding: 1rem; color: var(--color-ink-muted); font-family: var(--font-mono); }
.scope__hint { font-size: 0.8rem; }
.scope__frozen-tag {
  position: absolute; top: 0.5rem; left: 0.5rem; display: inline-flex; align-items: center; gap: 0.3rem;
  font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.08em; color: var(--color-primary);
  background: rgba(2, 6, 4, 0.7); padding: 0.15em 0.5em; border-radius: 5px;
}
.scope__draghint { position: absolute; left: 0; right: 0; bottom: 0.6rem; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; pointer-events: none; }
.scope__draghint-text { font-family: var(--font-retro); font-size: clamp(0.9rem, 2vw, 1.2rem); letter-spacing: 0.04em; color: var(--color-ink-strong); background: rgba(2, 6, 4, 0.72); padding: 0.2em 0.7em; border-radius: 999px; text-shadow: var(--glow-soft); }
.scope__arrows { display: flex; gap: 0.6rem; color: var(--color-primary); font-size: 1.1rem; }
.scope__arrows span { animation: arrow-bounce 1.2s ease-in-out infinite; }
.scope__arrows span:nth-child(2) { animation-delay: 0.15s; }
.scope__arrows span:nth-child(3) { animation-delay: 0.3s; }
@keyframes arrow-bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(5px); opacity: 1; } }
.scope__tools { display: flex; gap: 0.6rem; padding: 0.6rem; border-top: 1px solid var(--color-primary-dim); }
.scope__btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-family: var(--font-retro); font-size: clamp(1.2rem, 2.6vw, 1.7rem); letter-spacing: 0.04em;
  color: var(--color-ink-muted); background: var(--color-background-2);
  border: 1px solid var(--color-primary-dim); border-radius: 12px; padding: 0.8em 1em; cursor: pointer;
  transition: transform 0.14s var(--ease-out), border-color 0.14s var(--ease-out), color 0.14s var(--ease-out);
}
.scope__btn:active { transform: scale(0.98); }
.scope__btn--on { color: var(--color-ink-strong); border-color: var(--color-primary); box-shadow: var(--glow-soft); }
@media (prefers-reduced-motion: reduce) { .scope__arrows span { animation: none; opacity: 0.9; } }
</style>
