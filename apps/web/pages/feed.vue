<script setup lang="ts">
type Message = { id: number; from: 'agent' | 'investor'; text: string; time: string }

const messages = ref<Message[]>([
  { id: 1, from: 'agent', text: 'Hello! Interested in our latest token drop?', time: '10:02' },
  { id: 2, from: 'investor', text: 'Tell me more about the utility.', time: '10:03' },
  { id: 3, from: 'agent', text: 'It powers staking and governance with low fees.', time: '10:04' },
  { id: 4, from: 'investor', text: 'Sounds good. What’s the cap?', time: '10:05' }
])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Live Feed</h1>
      <p class="text-sm text-gray-500">Recent agent ↔ investor messages</p>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="space-y-3">
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex"
          :class="m.from === 'agent' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] rounded px-3 py-2 text-sm shadow"
            :class="m.from === 'agent' ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-900'"
          >
            <div class="whitespace-pre-wrap">{{ m.text }}</div>
            <div class="mt-1 text-[10px] text-gray-500 text-right">{{ m.time }}</div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
