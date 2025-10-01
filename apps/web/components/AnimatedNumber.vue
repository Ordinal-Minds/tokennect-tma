<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  fractionDigits?: number
}>(), {
  duration: 500,
  prefix: '',
  suffix: '',
  fractionDigits: 0,
})

const display = ref(props.value)
let raf: number | null = null

watch(() => props.value, (to, from) => {
  if (raf) cancelAnimationFrame(raf)
  const start = performance.now()
  const fromVal = Number(from ?? 0)
  const toVal = Number(to ?? 0)
  const animate = (t: number) => {
    const p = Math.min(1, (t - start) / props.duration)
    display.value = fromVal + (toVal - fromVal) * (1 - Math.pow(1 - p, 3)) // ease-out-cubic
    if (p < 1) raf = requestAnimationFrame(animate)
  }
  raf = requestAnimationFrame(animate)
}, { immediate: true })

onUnmounted(() => { if (raf) cancelAnimationFrame(raf) })

const formatted = computed(() =>
  `${props.prefix}${display.value.toLocaleString(undefined, { maximumFractionDigits: props.fractionDigits })}${props.suffix}`,
)
</script>

<template>
  <span>{{ formatted }}</span>
</template>

<style scoped>
</style>

