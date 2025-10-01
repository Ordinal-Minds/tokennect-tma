<script setup lang="ts">
const config = useRuntimeConfig()
const { data, pending, refresh, error } = await useFetch<{
  ok: boolean
  service: string
  timestamp: string
}>('/health', { baseURL: config.public.apiBase + '/api' })

const stats = reactive([
  { label: 'Active Agents', value: 2 },
  { label: 'Tokens', value: 7 },
  { label: 'Investors', value: 18 },
  { label: 'Credits', value: 1240 },
])

const agentRunning = ref(false)
function runAgent() {
  agentRunning.value = true
}
function pauseAgent() {
  agentRunning.value = false
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Dashboard</h1>
        <p class="text-sm text-gray-500">Overview of activity and credits</p>
      </div>
      <div class="flex gap-2">
        <UButton color="primary" :disabled="agentRunning" @click="runAgent"
          >Run Agent</UButton
        >
        <UButton
          color="gray"
          variant="outline"
          :disabled="!agentRunning"
          @click="pauseAgent"
          >Pause Agent</UButton
        >
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard
        v-for="s in stats"
        :key="s.label"
        class="!bg-card !border-border shadow-card rounded-lg"
      >
        <div class="text-sm text-gray-500">{{ s.label }}</div>
        <div class="mt-1 text-2xl font-semibold">{{ s.value }}</div>
      </UCard>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-medium">API Health</h2>
          <p class="text-sm text-gray-500">Quick connectivity check</p>
        </div>
        <UButton color="primary" :loading="pending" @click="refresh()"
          >Ping API</UButton
        >
      </div>
      <div class="mt-4 space-y-2">
        <p v-if="error" class="text-red-600">API error: {{ error.message }}</p>
        <div v-else>
          <p>API base: {{ config.public.apiBase }}</p>
          <p>
            Status:
            <UBadge :color="data?.ok ? 'green' : 'orange'">{{
              data?.ok ? 'OK' : '...'
            }}</UBadge>
          </p>
          <p v-if="data?.timestamp" class="text-xs text-gray-500">
            Timestamp: {{ data.timestamp }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
