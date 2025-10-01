<script setup lang="ts">
const toast = useToast()

const form = reactive({
  autoOutreach: true,
  followUpLimit: 3,
  autoInvestCap: 250
})

function onSave() {
  toast.add({ title: 'Bot rules saved', description: 'Changes are not persisted yet.' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Bot Rules</h1>
      <p class="text-sm text-gray-500">Automation thresholds and limits</p>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <UFormGroup label="Auto outreach">
            <USwitch v-model="form.autoOutreach" />
          </UFormGroup>
          <UFormGroup label="Follow-up limit">
            <UInput v-model.number="form.followUpLimit" type="number" min="0" />
          </UFormGroup>
        </div>
        <div class="space-y-4">
          <UFormGroup label="Auto-invest cap (USD)">
            <UInput v-model.number="form.autoInvestCap" type="number" min="0" step="50" />
          </UFormGroup>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <UButton color="primary" @click="onSave">Save</UButton>
      </div>
    </UCard>
  </div>
</template>
