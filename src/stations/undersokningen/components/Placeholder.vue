<script setup lang="ts">
/**
 * Bild med placeholder-fallback (§7). Försöker ladda `path` ur public/; saknas
 * filen renderas en tydlig ruta med etikett + filnamnet, så Josef kan droppa in
 * riktiga bilder sen utan att något kraschar.
 */
import { ref, computed } from 'vue'
import { asset } from '@/config'

const props = defineProps<{ path: string; label: string }>()
const failed = ref(false)
const src = computed(() => asset(props.path))
</script>

<template>
  <div class="ph amber-frame" :class="{ 'ph--empty': failed }">
    <img v-if="!failed" :src="src" :alt="label" class="ph__img" @error="failed = true" />
    <div v-else class="ph__box">
      <span class="ph__label">{{ label }}</span>
      <span class="ph__file mono">{{ path }}</span>
    </div>
  </div>
</template>

<style scoped>
.ph {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.ph__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ph__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-align: center;
  padding: 1rem;
  width: 100%;
  height: 100%;
  background:
    repeating-linear-gradient(
      45deg,
      transparent 0 10px,
      rgba(var(--mode-accent-rgb), 0.05) 10px 20px
    );
}
.ph__label {
  font-family: var(--font-retro);
  font-size: 1.1rem;
  letter-spacing: 0.08em;
  color: var(--color-ink-strong);
}
.ph__file {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}
</style>
