<script setup lang="ts">
const config = useRuntimeConfig()
const { data, pending, refresh, error } = await useFetch<{
  ok: boolean
  service: string
  timestamp: string
}>("/health", { baseURL: config.public.apiBase + "/api" })
</script>

<template>
  <div class="p-8 space-y-6">
    <UCard>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Nuxt + Nuxt UI + Tailwind</h1>
          <p class="text-sm text-gray-500">Strict TS, pnpm monorepo</p>
        </div>
        <UButton color="primary" :loading="pending" @click="refresh()">Ping API</UButton>
      </div>
      <div class="mt-4 space-y-2">
        <p v-if="error" class="text-red-600">API error: {{ error.message }}</p>
        <div v-else>
          <p>API base: {{ config.public.apiBase }}</p>
          <p>
            Status:
            <UBadge :color="data?.ok ? 'green' : 'orange'">{{ data?.ok ? 'OK' : '...' }}</UBadge>
          </p>
          <p v-if="data?.timestamp" class="text-xs text-gray-500">Timestamp: {{ data.timestamp }}</p>
        </div>
      </div>
    </UCard>
  </div>
  
</template>

