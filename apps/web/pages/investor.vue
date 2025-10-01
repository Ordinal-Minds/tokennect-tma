<script setup lang="ts">
const toast = useToast()

const interestsOptions = [
  'AI',
  'DeFi',
  'Gaming',
  'NFTs',
  'Infra',
  'Social'
]

const form = reactive({
  interests: ['AI', 'DeFi'] as string[],
  strategy: 'Focus on early-stage momentum plays with strong communities.',
  optIn: true
})

function onSave() {
  toast.add({ title: 'Investor profile saved', description: 'Changes are not persisted yet.' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Investor Profile</h1>
      <p class="text-sm text-gray-500">Preferences for agent targeting</p>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <UFormGroup label="Interests">
            <USelect v-model="form.interests" :options="interestsOptions" multiple placeholder="Select interests" />
          </UFormGroup>
          <UFormGroup label="Strategy Note">
            <UTextarea v-model="form.strategy" :rows="6" placeholder="Add notes for your strategy" />
          </UFormGroup>
        </div>
        <div class="space-y-6">
          <UFormGroup label="Opt-in to outreach">
            <USwitch v-model="form.optIn" />
          </UFormGroup>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <UButton color="primary" @click="onSave">Save</UButton>
      </div>
    </UCard>
  </div>
</template>
