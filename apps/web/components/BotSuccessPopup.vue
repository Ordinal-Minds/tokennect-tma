<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
  description?: string
  ctaTo?: string
  ctaLabel?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const _title = computed(() => props.title || 'Bot ready')
const _desc = computed(
  () =>
    props.description ||
    'Your changes are live. The agent will use the new configuration on its next run.'
)
</script>

<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <UCard class="!bg-card !border-border">
      <div class="flex flex-col items-center text-center gap-3 py-2">
        <div class="text-5xl" aria-hidden="true">🤖</div>
        <h3 class="text-lg font-semibold">{{ _title }}</h3>
        <p class="text-sm text-gray-600">{{ _desc }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="soft" @click="isOpen = false">Close</UButton>
          <UButton v-if="ctaTo" color="primary" :to="ctaTo" @click="isOpen = false">
            {{ ctaLabel || 'View Feed' }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
  
</template>

