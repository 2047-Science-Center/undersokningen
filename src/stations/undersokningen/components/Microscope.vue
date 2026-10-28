<script setup lang="ts">
/**
 * Dino-Lite-vy (labb-sidan). Mikroskopet ansluts som en USB-webbkamera och
 * väljs automatiskt på namnet (config.cameraLabel, "dino" → "Dino-Lite Premier").
 * En kamera-dropdown finns som manuell reserv ifall auto-valet missar på NUC:en.
 * Portad från public/mikroskop/index.html. Tål att ingen kamera finns.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { config } from '@/config'
import { useI18n } from '@/station-kit/i18n'
import Icon from './Icon.vue'

const { t } = useI18n()
const video = ref<HTMLVideoElement | null>(null)
const msg = ref<string>('')
const mirror = ref(false)
const frozen = ref(false)
const cameras = ref<MediaDeviceInfo[]>([])
const currentId = ref<string>('')
let stream: MediaStream | null = null

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
  if (stream) stream.getTracks().forEach((t) => t.stop())
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
function toggleMirror(): void {
  mirror.value = !mirror.value
}
function toggleFreeze(): void {
  frozen.value = !frozen.value
  if (!video.value) return
  if (frozen.value) video.value.pause()
  else void video.value.play()
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
  if (stream) stream.getTracks().forEach((t) => t.stop())
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
      <div class="scope__tools">
        <button class="scope__btn" :class="{ 'scope__btn--on': mirror }" @click="toggleMirror">{{ t('mikroskop.mirror') }}</button>
        <button class="scope__btn" :class="{ 'scope__btn--on': frozen }" @click="toggleFreeze">{{ t('mikroskop.freeze') }}</button>
      </div>
    </div>
    <div class="scope__stage">
      <video ref="video" class="scope__video" :class="{ 'scope__video--mirror': mirror }" autoplay playsinline muted />
      <div v-if="msg" class="scope__msg">
        <Icon name="mikroskop" :size="34" />
        <span>{{ msg }}</span>
        <span class="scope__hint">{{ t('mikroskop.allow') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scope { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.scope__head { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--color-primary-dim); }
.scope__title { font-family: var(--font-retro); letter-spacing: 0.08em; color: var(--color-primary); }
.scope__cam {
  font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-muted);
  background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 6px;
  padding: 0.1em 0.4em; max-width: 12rem;
}
.scope__tools { margin-left: auto; display: flex; gap: 0.4rem; }
.scope__btn { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-muted); background: var(--color-background-2); border: 1px solid var(--color-primary-dim); border-radius: 6px; padding: 0.15em 0.6em; cursor: pointer; transition: transform 0.14s var(--ease-out); }
.scope__btn:active { transform: scale(0.96); }
.scope__btn--on { color: var(--color-ink-strong); border-color: var(--color-primary); }
.scope__stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; }
.scope__video { max-width: 100%; max-height: 100%; display: block; }
.scope__video--mirror { transform: scaleX(-1); }
.scope__msg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; padding: 1rem; color: var(--color-ink-muted); font-family: var(--font-mono); }
.scope__hint { font-size: 0.8rem; }
</style>
