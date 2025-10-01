<script setup lang="ts">
const {
  portfolioRows,
  salesRows,
  portfolioTotal,
  salesTotal,
  portfolioColumns,
  salesColumns,
} = useDemoPortfolio()
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
