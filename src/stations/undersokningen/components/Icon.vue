<script setup lang="ts">
/**
 * Monokroma SVG-ikoner i accentfärgen (currentColor) — ALDRIG färgemoji.
 * Ett element, namngivna paths. Ärver färg från --color-primary via currentColor
 * så de följer läget (blått i övning, orange skarpt).
 */
defineProps<{ name: 'uv' | 'scanner' | 'mikroskop' | 'prov' | 'exponering'; size?: number }>()
</script>

<template>
  <svg
    class="ic"
    :width="size ?? 24"
    :height="size ?? 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- UV-penna: pennkropp + strålar -->
    <template v-if="name === 'uv'">
      <path d="M4 20l5-5" />
      <path d="M9 15l5-5 3 3-5 5z" />
      <path d="M14 10l3-3 1.5 1.5-3 3z" />
      <path d="M19 4l1.5 1.5M17 3l.8 1.6M21 7l-1.6.8" />
    </template>
    <!-- Scanner: handhållen läsare + läs-våg -->
    <template v-else-if="name === 'scanner'">
      <rect x="7" y="3" width="10" height="13" rx="2" />
      <path d="M10 16v3a2 2 0 002 2 2 2 0 002-2v-3" />
      <path d="M9.5 7.5h5M9.5 10.5h5" />
    </template>
    <!-- Mikroskop -->
    <template v-else-if="name === 'mikroskop'">
      <path d="M6 21h12" />
      <path d="M9 21a6 6 0 006-9" />
      <path d="M10 5l4 2-2.5 5-4-2z" />
      <path d="M8.5 9.5l-2 1" />
      <path d="M12 3l2 1" />
    </template>
    <!-- Prov/virus: kärna + utskott -->
    <template v-else-if="name === 'prov'">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </template>
    <!-- Exponering/varning: triangel + utrop -->
    <template v-else-if="name === 'exponering'">
      <path d="M12 3L2 20h20z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>

<style scoped>
.ic {
  display: inline-block;
  vertical-align: middle;
  filter: drop-shadow(var(--glow-soft));
}
</style>
