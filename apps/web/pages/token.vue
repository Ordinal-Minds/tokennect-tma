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

const config = useRuntimeConfig()
const apiBase = computed(() => ((config.public.apiBase as string) || 'http://localhost:3001').replace(/\/$/, ''))
const toast = useToast()
const { token: authToken } = useTma()

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
  if (!authToken.value) return
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; token: TokenDTO | null }>('/token', {
      method: 'GET',
      baseURL: apiBase.value,
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    if (res?.token) {
      token.value = res.token
      mode.value = 'readonly'
    } else {
      mode.value = 'creating'
    }
  } catch (e: any) {
    console.error(e)
    toast.add({ title: 'Failed to load token', color: 'red' })
  } finally {
    loading.value = false
  }
}

// When auth becomes available later (mock login), fetch the existing token
watch(() => authToken.value, (v) => {
  if (v) fetchExisting()
})

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
    if (!authToken.value) {
      toast.add({ title: 'Not authenticated', color: 'red' })
      return
    }
    if (!form.name || !form.symbol || !form.imageFile) {
      toast.add({ title: 'Please fill required fields', color: 'orange' })
      return
    }
    loading.value = true
    const fd = new FormData()
    fd.set('name', form.name.trim())
    fd.set('symbol', form.symbol.trim())
    if (form.description) fd.set('description', form.description.trim())
    fd.set('hardCapTier', form.hardCapTier)
    fd.set('timeLimitDays', String(form.timeLimitDays))
    fd.set('totalSupply', String(form.totalSupply))
    fd.set('image', form.imageFile)

    const res = await $fetch<{ ok: boolean; token: TokenDTO }>('/token', {
      method: 'POST',
      baseURL: apiBase.value,
      body: fd,
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    token.value = res.token
    mode.value = 'readonly'
    toast.add({ title: 'Token created' })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Failed to create token'
    toast.add({ title: 'Error', description: msg, color: 'red' })
  } finally {
    loading.value = false
  }
}

// Demo stats/charts (placeholder)
const stats = reactive([
  { label: 'Transactions', value: 0 },
  { label: 'Holders', value: 0 },
  { label: 'Circulating', value: 0 },
  { label: 'TVL (DeFi)', value: 0 },
])

const chartData = reactive({
  tx: Array.from({ length: 12 }, (_, i) => Math.round(10 + Math.random() * 50)),
  holders: Array.from({ length: 12 }, () => Math.round(100 + Math.random() * 80))
})

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
        <UCard v-for="s in stats" :key="s.label" class="!bg-card !border-border shadow-card rounded-lg">
          <div class="text-sm text-gray-500">{{ s.label }}</div>
          <div class="mt-1 text-2xl font-semibold">{{ s.value }}</div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Transactions (30d)</h2>
          </div>
          <svg :viewBox="`0 0 120 40`" class="w-full h-32">
            <polyline
              :points="chartData.tx.map((v,i)=>`${(i/(chartData.tx.length-1))*120},${40 - (v/max(chartData.tx))*38}`).join(' ')"
              fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500" />
          </svg>
        </UCard>
        <UCard class="!bg-card !border-border shadow-card rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-medium">Holders (30d)</h2>
          </div>
          <svg :viewBox="`0 0 120 40`" class="w-full h-32">
            <polyline
              :points="chartData.holders.map((v,i)=>`${(i/(chartData.holders.length-1))*120},${40 - (v/max(chartData.holders))*38}`).join(' ')"
              fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-500" />
          </svg>
        </UCard>
      </div>
    </template>
  </div>
</template>
