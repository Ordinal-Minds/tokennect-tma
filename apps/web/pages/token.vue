<script setup lang="ts">
type TokenDTO = {
  id: string
  ownerTgId: string
  name: string
  symbol: string
  description: string | null
  chainAddress: string
  hardCapTier: 'TON_50' | 'TON_200' | 'TON_500' | 'TON_1000' | 'TON_5000'
  timeLimitDays: number
  totalSupply: string
  imagePath: string
  imageUrl: string
  createdAt: string
  updatedAt: string
}

const toast = useToast()

const mode = ref<'creating' | 'readonly'>('creating')
const loading = ref(false)
const token = ref<TokenDTO | null>(null)

const form = reactive({
  name: '',
  symbol: '',
  description: '',
  hardCapTier: 'TON_50' as TokenDTO['hardCapTier'],
  timeLimitDays: 30,
  totalSupply: 1_000_000_000,
  imageFile: null as File | null,
  imagePreview: '' as string
})

const tierOptions = [
  { label: '50 TON', value: 'TON_50' },
  { label: '200 TON', value: 'TON_200' },
  { label: '500 TON', value: 'TON_500' },
  { label: '1K TON', value: 'TON_1000' },
  { label: '5K TON', value: 'TON_5000' }
]
const timeOptions = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 }
]

onMounted(async () => {
  await fetchExisting()
})

async function fetchExisting() {
  loading.value = true
  try {
    const raw = window.localStorage.getItem('DEMO_TOKEN')
    if (raw) {
      const parsed = JSON.parse(raw) as TokenDTO
      token.value = parsed
      mode.value = 'readonly'
    } else {
      mode.value = 'creating'
    }
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Failed to load token', color: 'red' })
  } finally {
    loading.value = false
  }
}

function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  form.imageFile = file
  const reader = new FileReader()
  reader.onload = () => {
    form.imagePreview = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

async function onCreate() {
  try {
    if (!form.name || !form.symbol || !form.imageFile) {
      toast.add({ title: 'Please fill required fields', color: 'orange' })
      return
    }
    loading.value = true

    const id = `tok_${Math.random().toString(36).slice(2, 10)}`
    const now = new Date().toISOString()
    const symbol = form.symbol.trim().toUpperCase().slice(0, 6)
    const name = form.name.trim()
    const description = form.description?.trim() || null
    const totalSupply = String(form.totalSupply)

    // Fake TON address (visually plausible)
    const chainAddress = `EQ${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => (b % 16).toString(16))
      .join('')
      .slice(0, 46)}`

    const imageUrl = form.imagePreview || `https://picsum.photos/seed/${encodeURIComponent(symbol)}/200/200`

    const newToken: TokenDTO = {
      id,
      ownerTgId: 'demo:user',
      name,
      symbol,
      description,
      chainAddress,
      hardCapTier: form.hardCapTier,
      timeLimitDays: form.timeLimitDays,
      totalSupply,
      imagePath: imageUrl,
      imageUrl,
      createdAt: now,
      updatedAt: now
    }

    token.value = newToken
    mode.value = 'readonly'
    try { window.localStorage.setItem('DEMO_TOKEN', JSON.stringify(newToken)) } catch {}
    toast.add({ title: 'Token created' })
    // kick off demo feed right away
    feed.start()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Failed to create token'
    toast.add({ title: 'Error', description: msg, color: 'red' })
  } finally {
    loading.value = false
  }
}

// Live demo feed: price, transactions, holders, series
const feed = useDemoTokenFeed(computed(() => token.value ? ({
  id: token.value.id,
  symbol: token.value.symbol,
  totalSupply: token.value.totalSupply,
}) : null))

// Visible stats cards derived from simulator
const statsList = computed(() => ([
  { label: 'Transactions', value: feed.transactions.value },
  { label: 'Holders', value: feed.holdersCount.value },
  { label: 'Circulating', value: feed.circulating.value },
  { label: 'TVL (DeFi)', value: feed.tvlTon.value },
]))

const chartTx = computed(() => feed.seriesTx.value)
const chartHolders = computed(() => feed.seriesHolders.value)

const chartPrice = computed(() => feed.seriesPrice.value)

function max(arr: number[]) { return Math.max(1, ...arr) }
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Token</h1>
      <p class="text-sm text-gray-500">Create once, then view stats</p>
    </div>

    <UCard v-if="mode === 'creating'" class="!bg-card !border-border shadow-card rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <UFormGroup label="Name" required>
            <UInput v-model="form.name" placeholder="Token name" />
          </UFormGroup>
          <UFormGroup label="Symbol" required>
            <UInput v-model="form.symbol" placeholder="e.g. TKN" />
          </UFormGroup>
          <UFormGroup label="Image" required>
            <input type="file" accept="image/*" @change="onPickImage" />
            <div v-if="form.imagePreview" class="mt-2">
              <img :src="form.imagePreview" alt="preview" class="h-20 w-20 rounded bg-gray-100 object-cover" />
            </div>
          </UFormGroup>
          <UFormGroup label="Description">
            <UTextarea v-model="form.description" :rows="5" placeholder="Describe your token" />
          </UFormGroup>
        </div>

        <div class="space-y-4">
          <UFormGroup label="Hard cap tier" required>
            <USelect v-model="form.hardCapTier" :options="tierOptions" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Time limit" required>
            <USelect v-model="form.timeLimitDays" :options="timeOptions" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Total supply" required>
            <UInput v-model.number="form.totalSupply" type="number" min="1" placeholder="e.g. 1000000000" />
          </UFormGroup>
          <div class="text-xs text-gray-500">Default supply is 1,000,000,000</div>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <UButton color="primary" :loading="loading" @click="onCreate">Create Token</UButton>
      </div>
    </UCard>

    <template v-else>
      <UCard class="!bg-card !border-border shadow-card rounded-lg">
        <div class="flex items-center gap-4">
          <img :src="token?.imageUrl" alt="token" class="h-20 w-20 rounded bg-gray-100 object-cover" />
          <div>
            <div class="text-xl font-semibold leading-tight">{{ token?.name }} <span class="text-gray-500">({{ token?.symbol }})</span></div>
            <div class="text-sm text-gray-500 mt-1">Hard cap: {{ token?.hardCapTier.replace('TON_', '') }} TON • Time limit: {{ token?.timeLimitDays }} days • Supply: {{ Number(token?.totalSupply || 0).toLocaleString() }}</div>
            <div class="text-xs text-gray-500 mt-1">Chain address (TON): <span class="font-mono">{{ token?.chainAddress }}</span></div>
            <p v-if="token?.description" class="mt-2 text-sm">{{ token?.description }}</p>
          </div>
        </div>
      </UCard>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="s in statsList" :key="s.label" class="!bg-card !border-border shadow-card rounded-lg">
          <div class="text-sm text-gray-500">{{ s.label }}</div>
          <div class="mt-1 text-2xl font-semibold">
            <AnimatedNumber :value="Number(s.value)" :fraction-digits="s.label === 'TVL (DeFi)' ? 2 : 0" />
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Price</h2>
            <div class="text-sm text-gray-500">USD</div>
          </div>
          <div class="text-3xl font-semibold">
            <AnimatedNumber :value="feed.priceUsd.value" :fraction-digits="6" prefix="$" />
          </div>
          <svg :viewBox="`0 0 120 40`" class="w-full h-20 mt-2">
            <polyline :points="chartPrice.map((v,i)=>`${(i/(chartPrice.length-1))*120},${40 - (v/Math.max(...chartPrice))*38}`).join(' ')" fill="none" stroke="currentColor" stroke-width="2" class="text-fuchsia-500" />
          </svg>
          <div class="mt-2 flex gap-2">
            <UButton size="xs" color="primary" variant="soft" @click="feed.simulateBuy()">Simulate Buy</UButton>
            <UButton size="xs" color="rose" variant="soft" @click="feed.simulateSell()">Simulate Sell</UButton>
            <UButton size="xs" color="emerald" variant="soft" @click="feed.simulateAirdrop()">Airdrop</UButton>
            <UButton size="xs" color="gray" variant="ghost" @click="feed.reset()">Reset</UButton>
          </div>
        </UCard>
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Transactions (30d)</h2>
          </div>
          <svg :viewBox="`0 0 120 40`" class="w-full h-32">
            <polyline
              :points="chartTx.map((v,i)=>`${(i/(chartTx.length-1))*120},${40 - (v/max(chartTx))*38}`).join(' ')"
              fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500" />
          </svg>
        </UCard>
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Holders (30d)</h2>
          </div>
          <svg :viewBox="`0 0 120 40`" class="w-full h-32">
            <polyline
              :points="chartHolders.map((v,i)=>`${(i/(chartHolders.length-1))*120},${40 - (v/max(chartHolders))*38}`).join(' ')"
              fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-500" />
          </svg>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Live Transactions</h2>
          </div>
          <div class="space-y-2 max-h-80 overflow-auto pr-1">
            <TransitionGroup name="list" tag="div">
              <div v-for="tx in feed.txs.value" :key="tx.id" class="flex items-center justify-between rounded border border-border px-3 py-2 bg-background/60">
                <div class="text-xs font-mono text-gray-500">{{ new Date(tx.ts).toLocaleTimeString() }}</div>
                <div class="text-sm">
                  <span :class="tx.type === 'BUY' ? 'text-blue-600' : tx.type === 'SELL' ? 'text-rose-600' : 'text-emerald-600'">{{ tx.type }}</span>
                  <span class="mx-1">•</span>
                  <span class="font-mono">{{ tx.amount.toLocaleString() }}</span>
                  <span class="text-gray-500">{{ token?.symbol }}</span>
                </div>
                <div class="text-xs font-mono text-gray-500 truncate w-28">{{ tx.txHash }}</div>
              </div>
            </TransitionGroup>
          </div>
        </UCard>
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Top Holders</h2>
          </div>
          <div class="space-y-2">
            <div v-for="h in feed.topHolders.value" :key="h.addr" class="flex items-center justify-between rounded bg-background/60 px-3 py-2">
              <div class="text-xs font-mono truncate w-56">{{ h.addr }}</div>
              <div class="text-sm font-semibold">{{ h.bal.toLocaleString() }}</div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.list-enter-active, .list-leave-active { transition: all 0.35s ease; }
.list-enter-from { opacity: 0; transform: translateY(-6px); }
.list-leave-to { opacity: 0; transform: translateY(6px); }
</style>
