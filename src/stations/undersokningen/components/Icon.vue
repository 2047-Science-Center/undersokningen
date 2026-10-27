<script setup lang="ts">
/**
 * Monokroma, egenproducerade SVG-ikoner i accentfärgen (currentColor) — ALDRIG
 * färgemoji. Ett element, namngivna paths. Ärver läges-färgen via currentColor.
 */
export type IconName =
  | 'uv' | 'scanner' | 'mikroskop' | 'prov' | 'exponering'
  | 'finger' | 'logg' | 'klocka' | 'person' | 'check' | 'close'
  | 'har_manniska' | 'har_djur' | 'har_syntet'
defineProps<{ name: IconName; size?: number }>()
</script>

<template>
  <svg
    class="ic" :width="size ?? 24" :height="size ?? 24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  >
    <template v-if="name === 'uv'">
      <path d="M4 20l5-5" /><path d="M9 15l5-5 3 3-5 5z" /><path d="M14 10l3-3 1.5 1.5-3 3z" />
      <path d="M19 4l1.5 1.5M17 3l.8 1.6M21 7l-1.6.8" />
    </template>
    <template v-else-if="name === 'scanner'">
      <rect x="7" y="3" width="10" height="13" rx="2" /><path d="M10 16v3a2 2 0 002 2 2 2 0 002-2v-3" /><path d="M9.5 7.5h5M9.5 10.5h5" />
    </template>
    <template v-else-if="name === 'mikroskop'">
      <path d="M6 21h12" /><path d="M9 21a6 6 0 006-9" /><path d="M10 5l4 2-2.5 5-4-2z" /><path d="M8.5 9.5l-2 1" /><path d="M12 3l2 1" />
    </template>
    <template v-else-if="name === 'prov'">
      <circle cx="12" cy="12" r="5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </template>
    <template v-else-if="name === 'exponering'">
      <path d="M12 3L2 20h20z" /><path d="M12 9v5" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </template>
    <!-- Fingeravtryck -->
    <template v-else-if="name === 'finger'">
      <path d="M12 4a7 7 0 00-7 7v3M19 11a7 7 0 00-3-5.7M8 20c-.6-1.2-1-2.6-1-4v-3a5 5 0 019-3M16 12v2a9 9 0 001 4M12 11v4a6 6 0 00.8 3" />
    </template>
    <!-- Logg / dokument -->
    <template v-else-if="name === 'logg'">
      <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </template>
    <!-- Klocka -->
    <template v-else-if="name === 'klocka'">
      <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" />
    </template>
    <!-- Person -->
    <template v-else-if="name === 'person'">
      <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0114 0" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M5 13l4 4L19 7" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <!-- Hårtyper: strå med inre struktur -->
    <template v-else-if="name === 'har_manniska'">
      <rect x="9.5" y="3" width="5" height="18" rx="2.5" /><path d="M12 6v12" stroke-dasharray="1.5 2.2" stroke-width="1.1" />
    </template>
    <template v-else-if="name === 'har_djur'">
      <rect x="9" y="3" width="6" height="18" rx="3" /><path d="M9.6 7.5h4.8M9.6 10.5h4.8M9.6 13.5h4.8M9.6 16.5h4.8" stroke-width="1.1" />
    </template>
    <template v-else-if="name === 'har_syntet'">
      <rect x="10" y="3" width="4" height="18" rx="2" /><path d="M11 6v12" stroke-width="1.1" />
    </template>
  </svg>
</template>

<style scoped>
.ic { display: inline-block; vertical-align: middle; filter: drop-shadow(var(--glow-soft)); }
</style>
