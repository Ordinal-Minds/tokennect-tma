<script setup lang="ts">
import { useTonConnect } from '~/composables/useTonConnect'

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
const apiBase = computed(() => ((config.public.apiBase as string) || 'http://localhost:3001').replace(/\/$/, ''))
const { token: authToken } = useTma()
const { connected: tonConnected, address: tonAddress, connect: tonConnect, disconnect: tonDisconnect } = useTonConnect()

const agentRunning = ref(false)
const togglingAgent = ref(false)
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
  if (togglingAgent.value) return
  if (next) {
    const ok = await checkAgentInitialized()
    if (!ok) {
      // Demo mode: gently guide, but do not block
      showInitModal.value = true
      agentRunning.value = true
      useToast().add({ title: 'Demo started', description: 'Running with demo defaults. Visit Bot Setup to personalize.', color: 'green' })
      return
    }
  }
  if (!authToken.value) return
  togglingAgent.value = true
  try {
    await $fetch<{ ok: boolean; bot: any }>('/bot', {
      method: 'POST',
      baseURL: apiBase.value,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
      body: { isActive: next }
    })
    agentRunning.value = next
    const toast = useToast()
    toast.add({ title: next ? 'Bot resumed' : 'Bot paused', color: next ? 'green' : 'orange' })
  } catch (e: any) {
    // Demo mode: do not fail; reflect UI state and notify
    agentRunning.value = next
    useToast().add({ title: next ? 'Demo running' : 'Demo paused', color: next ? 'green' : 'orange' })
  } finally {
    togglingAgent.value = false
  }
}

function gotoBotSetup() {
  showInitModal.value = false
  router.push('/bot')
}

// TON wallet MVP: per-bot balance and deposit info
const botTonAddress = ref<string>('')
const botDepositComment = ref<string>('')
const botBalanceTon = ref<string>('0.000000000')
const userTonAddress = ref<string>('')
const linking = ref(false)

function openInTelegramWallet(to: string, comment?: string, amountTon?: string) {
  const params = new URLSearchParams()
  if (amountTon) {
    // amount in nanotons by spec; parse float safely
    const nano = Math.round(parseFloat(amountTon) * 1e9)
    if (Number.isFinite(nano) && nano > 0) params.set('amount', String(nano))
  }
  if (comment) params.set('text', comment)
  const url = `ton://transfer/${encodeURIComponent(to)}${params.toString() ? `?${params.toString()}` : ''}`
  try {
    const { openLink } = useTelegram()
    openLink(url)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

onMounted(async () => {
  await fetchBotWalletInfo()
  // Sync initial agent active state if bot exists
  try {
    if (!authToken.value) return
    const res = await $fetch<{ ok: boolean; bot: any | null }>('/bot', {
      method: 'GET',
      baseURL: apiBase.value,
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    if (res?.bot) {
      agentInitialized.value = true
      agentRunning.value = !!res.bot.isActive
    }
  } catch {}
})

// If user connects a TON wallet (e.g., Telegram Wallet inside TWA), auto-link it
watch(tonAddress, async (addr) => {
  try {
    if (!addr || !authToken.value) return
    // Normalize and link
    userTonAddress.value = addr
    await $fetch<{ ok: boolean; address: string }>("/wallet/link", {
      method: "POST",
      baseURL: apiBase.value,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken.value}` },
      body: { address: addr }
    })
    useToast().add({ title: "Wallet linked", description: "Telegram Wallet connected via TON Connect." })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Failed to link wallet'
    useToast().add({ title: 'Error', description: msg, color: 'red' })
  }
})

async function fetchBotWalletInfo() {
  try {
    if (!authToken.value) return
    const res = await $fetch<{ ok: true; bot: { id: string; handle: string; balanceTon: string }; deposit: { address: string; comment: string } }>(
      '/wallet/bot/info',
      { baseURL: apiBase.value, headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    botTonAddress.value = res.deposit.address
    botDepositComment.value = res.deposit.comment
    botBalanceTon.value = res.bot.balanceTon
  } catch (e) {
    // Ignore if user has no bot yet
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
    <UCard v-if="!useProfile().hasProfile.value" class="!bg-card !border-border">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-medium">Complete your profile</h2>
          <p class="text-sm text-gray-600">Add your details to unlock a polished profile page for the demo.</p>
        </div>
        <UButton color="primary" to="/profile/create">Create Profile</UButton>
      </div>
    </UCard>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Dashboard</h1>
        <p class="text-sm text-gray-500">24h overview of activity</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <USwitch :model-value="agentRunning" :disabled="togglingAgent" aria-label="Toggle agent running" @update:model-value="onToggleAgent" />
          <UBadge :color="agentRunning ? 'green' : 'gray'" variant="soft">
            <span v-if="agentRunning" class="inline-flex items-center gap-2" aria-live="polite">
              <span class="relative inline-flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-25"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5">
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
              </span>
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
          <p class="text-sm text-gray-500">Your bot balance and deposit details</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="text-sm text-gray-500">Bot balance (TON)</div>
          <div class="font-mono">{{ botBalanceTon }}</div>
          <div class="text-sm text-gray-500 mt-4">Deposit address (shared custody)</div>
          <div class="font-mono break-all">{{ botTonAddress || '—' }}</div>
          <div class="text-sm text-gray-500">Comment required</div>
          <div class="font-mono">{{ botDepositComment || 'BOT:<your-bot-id>' }}</div>
          <div class="text-xs text-gray-500">Include the exact comment to credit your bot.</div>
          <div class="pt-2">
            <UButton :disabled="!botTonAddress" color="gray" variant="outline" @click="openInTelegramWallet(botTonAddress, botDepositComment)">
              Open in Telegram Wallet
            </UButton>
          </div>
        </div>
        <div class="space-y-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Your TON wallet</span>
              <UBadge :color="tonConnected ? 'green' : 'gray'" variant="soft">{{ tonConnected ? 'Connected' : 'Not connected' }}</UBadge>
            </div>
            <div v-if="tonConnected" class="font-mono text-sm break-all">
              {{ tonAddress }}
            </div>
            <div class="flex gap-2">
              <UButton v-if="!tonConnected" color="primary" @click="tonConnect">Connect Telegram Wallet</UButton>
              <UButton v-else color="gray" variant="soft" @click="tonDisconnect">Disconnect</UButton>
            </div>
          </div>
          <UDivider label="or" class="my-2" />
          <UFormGroup label="Enter address manually">
            <UInput v-model="userTonAddress" placeholder="EQC... (bounceable)" :disabled="tonConnected" />
          </UFormGroup>
          <div>
            <UButton color="gray" :loading="linking" @click="linkWallet">Save Address</UButton>
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
