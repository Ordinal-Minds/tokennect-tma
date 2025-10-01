<script setup lang="ts">
const props = defineProps<{
  values: number[]
  width?: number
  height?: number
  strokeWidth?: number
}>()

const w = computed(() => props.width ?? 140)
const h = computed(() => props.height ?? 36)
const sw = computed(() => props.strokeWidth ?? 2)

const points = computed(() => {
  const vals = props.values || []
  if (!vals.length) return ''
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const stepX = vals.length > 1 ? w.value / (vals.length - 1) : 0
  return vals
    .map((v, i) => {
      const x = i * stepX
      const y = h.value - ((v - min) / span) * h.value
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const trend = computed(() => {
  const vals = props.values || []
  if (vals.length < 2) return 0
  const last = vals[vals.length - 1] ?? 0
  const first = vals[0] ?? 0
  return last - first
})
</script>

<template>
  <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" fill="none">
    <polyline
      :points="points"
      :stroke="trend >= 0 ? 'currentColor' : 'currentColor'"
      :stroke-width="sw"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      vector-effect="non-scaling-stroke"
    />
  </svg>
  
</template>

<style scoped>
svg { display: block; }
</style>
