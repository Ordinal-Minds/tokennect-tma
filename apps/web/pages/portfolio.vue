<script setup lang="ts">
const portfolioRows = ref([
  { token: 'TKN', name: 'Tokenect Coin', qty: 1250, price: 0.24, value: 300 },
  { token: 'DEF', name: 'DeFi Max', qty: 420, price: 1.2, value: 504 },
  { token: 'AIX', name: 'AI Nexus', qty: 90, price: 3.1, value: 279 }
])

const salesRows = ref([
  { date: '2025-09-24', token: 'AIX', amount: 150 },
  { date: '2025-09-25', token: 'TKN', amount: 85 },
  { date: '2025-09-26', token: 'DEF', amount: 210 }
])

const portfolioTotal = computed(() => portfolioRows.value.reduce((s, r) => s + r.value, 0))
const salesTotal = computed(() => salesRows.value.reduce((s, r) => s + r.amount, 0))

const portfolioColumns = [
  { key: 'token', label: 'Token' },
  { key: 'name', label: 'Name' },
  { key: 'qty', label: 'Qty' },
  { key: 'price', label: 'Price ($)' },
  { key: 'value', label: 'Value ($)' }
]

const salesColumns = [
  { key: 'date', label: 'Date' },
  { key: 'token', label: 'Token' },
  { key: 'amount', label: 'Amount ($)' }
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Portfolio / Sales</h1>
      <p class="text-sm text-gray-500">Holdings overview and recent sales</p>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-medium">Portfolio</h2>
        <UBadge color="gray">Total: ${{ portfolioTotal.toFixed(2) }}</UBadge>
      </div>
      <UTable :rows="portfolioRows" :columns="portfolioColumns" />
    </UCard>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-medium">Sales</h2>
        <UBadge color="gray">Total: ${{ salesTotal.toFixed(2) }}</UBadge>
      </div>
      <UTable :rows="salesRows" :columns="salesColumns" />
    </UCard>
  </div>
</template>
