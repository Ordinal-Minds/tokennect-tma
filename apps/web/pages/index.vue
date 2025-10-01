<script setup lang="ts">

// Demo 24h metrics & sparkline series
const {
  conversationsSeries,
  conversationsCurrent,
  conversationsDelta,
  conversationsDeltaPct,
  portfolioSeries,
  portfolioCurrent,
  portfolioDelta,
  portfolioDeltaPct,
} = useDemoStats()

// Demo portfolio snapshot (placeholder)
const { portfolioRows, portfolioTotal, portfolioColumns } = useDemoPortfolio()

// Agent run state + init check
const config = useRuntimeConfig()
const apiBase = computed(() => (config.public.apiBase as string) + '/api')
const { token: authToken } = useTma()

const agentRunning = ref(false)
const agentStatusText = computed(() => (agentRunning.value ? 'Running' : 'Paused'))

const checkingInit = ref(false)
const agentInitialized = ref<boolean | null>(null)
const showInitModal = ref(false)
const router = useRouter()

async function checkAgentInitialized(): Promise<boolean> {
  if (!authToken.value) return false
  checkingInit.value = true
  try {
    const res = await $fetch<{ ok: boolean; bot: any | null }>('/bot', {
      method: 'GET',
      baseURL: apiBase.value,
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    agentInitialized.value = !!res?.bot
    return agentInitialized.value
  } catch {
    agentInitialized.value = false
    return false
  } finally {
    checkingInit.value = false
  }
}

async function onToggleAgent(next: boolean) {
  if (next) {
    const ok = await checkAgentInitialized()
    if (!ok) {
      showInitModal.value = true
      agentRunning.value = false
      return
    }
  }
  agentRunning.value = next
}

function gotoBotSetup() {
  showInitModal.value = false
  router.push('/bot')
}

// TON wallet MVP: link user wallet and show bot wallet address
const botTonAddress = ref<string>('')
const userTonAddress = ref<string>('')
const linking = ref(false)

onMounted(async () => {
  await fetchBotAddress()
})

async function fetchBotAddress() {
  try {
    const res = await $fetch<{ ok: boolean; address: string }>('/wallet/bot-address', { baseURL: apiBase.value })
    botTonAddress.value = res.address
  } catch (e) {
    console.error(e)
  }
}

async function linkWallet() {
  if (!authToken.value) {
    useToast().add({ title: 'Not authenticated', color: 'red' })
    return
  }
  const addr = userTonAddress.value.trim()
  if (!addr) {
    useToast().add({ title: 'Enter your TON address', color: 'orange' })
    return
  }
  linking.value = true
  try {
    await $fetch<{ ok: boolean; address: string }>('/wallet/link', {
      method: 'POST',
      baseURL: apiBase.value,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
      body: { address: addr }
    })
    useToast().add({ title: 'Wallet linked', description: 'Your TON address is saved.' })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Failed to link wallet'
    useToast().add({ title: 'Error', description: msg, color: 'red' })
  } finally {
    linking.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Dashboard</h1>
        <p class="text-sm text-gray-500">24h overview of activity</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <USwitch :model-value="agentRunning" aria-label="Toggle agent running" @update:model-value="onToggleAgent" />
          <UBadge :color="agentRunning ? 'green' : 'gray'" variant="soft">
            <span v-if="agentRunning" class="inline-flex items-center gap-1" aria-live="polite">
              <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Running
            </span>
            <span v-else>Paused</span>
          </UBadge>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UCard class="!bg-card !border-border shadow-card rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Unique Agent Conversations (24h)</div>
            <div class="mt-1 text-2xl font-semibold flex items-baseline gap-2">
              <span>{{ conversationsCurrent }}</span>
              <span
                class="text-xs font-medium"
                :class="conversationsDelta >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                <span v-if="conversationsDelta >= 0">▲</span>
                <span v-else>▼</span>
                {{ Math.abs(conversationsDelta) }}
                <span class="text-gray-500">({{ conversationsDeltaPct.toFixed(1) }}%)</span>
              </span>
            </div>
          </div>
          <div class="text-green-600 dark:text-green-500">
            <Sparkline :values="conversationsSeries" :width="140" :height="40" />
          </div>
        </div>
      </UCard>

      <UCard class="!bg-card !border-border shadow-card rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Active Portfolio (24h)</div>
            <div class="mt-1 text-2xl font-semibold flex items-baseline gap-2">
              <span>${{ portfolioCurrent.toFixed(0) }}</span>
              <span
                class="text-xs font-medium"
                :class="portfolioDelta >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                <span v-if="portfolioDelta >= 0">▲</span>
                <span v-else>▼</span>
                ${{ Math.abs(portfolioDelta).toFixed(0) }}
                <span class="text-gray-500">({{ portfolioDeltaPct.toFixed(1) }}%)</span>
              </span>
            </div>
          </div>
          <div :class="portfolioDelta >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'">
            <Sparkline :values="portfolioSeries" :width="140" :height="40" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-lg font-medium">Portfolio Snapshot</h2>
          <p class="text-sm text-gray-500">Simulated holdings (demo)</p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge color="gray">Total: ${{ portfolioTotal.toFixed(2) }}</UBadge>
          <UButton to="/portfolio" color="gray" variant="outline">View portfolio</UButton>
        </div>
      </div>
      <UTable :rows="portfolioRows" :columns="portfolioColumns" />
    </UCard>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-lg font-medium">TON Wallet</h2>
          <p class="text-sm text-gray-500">Link your wallet and see the bot wallet address</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="text-sm text-gray-500">Bot wallet (send deposits here)</div>
          <div class="font-mono break-all">{{ botTonAddress || '—' }}</div>
          <div class="text-xs text-gray-500">Always verify address before sending funds.</div>
        </div>
        <div class="space-y-2">
          <UFormGroup label="Your TON address">
            <UInput v-model="userTonAddress" placeholder="EQC... (bounceable)" />
          </UFormGroup>
          <div>
            <UButton color="primary" :loading="linking" @click="linkWallet">Link Wallet</UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Init required modal -->
    <UModal v-model="showInitModal">
      <UCard class="!bg-card !border-border">
        <div class="space-y-2">
          <h3 class="text-base font-medium">Bot setup required</h3>
          <p class="text-sm text-gray-600">You need to initialize your bot before running the agent.</p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showInitModal = false">Cancel</UButton>
            <UButton color="primary" @click="gotoBotSetup">Open Bot Setup</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

  </div>
</template>
