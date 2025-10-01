export type PortfolioRow = {
  token: string
  name: string
  qty: number
  price: number
  value: number
}

export type SaleRow = {
  date: string
  token: string
  amount: number
}

export function useDemoPortfolio() {
  const portfolioRows = ref<PortfolioRow[]>([
    { token: 'TKN', name: 'Tokennect Coin', qty: 1250, price: 0.24, value: 300 },
    { token: 'DEF', name: 'DeFi Max', qty: 420, price: 1.2, value: 504 },
    { token: 'AIX', name: 'AI Nexus', qty: 90, price: 3.1, value: 279 },
  ])

  const salesRows = ref<SaleRow[]>([
    { date: '2025-09-24', token: 'AIX', amount: 150 },
    { date: '2025-09-25', token: 'TKN', amount: 85 },
    { date: '2025-09-26', token: 'DEF', amount: 210 },
  ])

  const portfolioTotal = computed(() =>
    portfolioRows.value.reduce((s, r) => s + r.value, 0),
  )

  const salesTotal = computed(() =>
    salesRows.value.reduce((s, r) => s + r.amount, 0),
  )

  const portfolioColumns = [
    { key: 'token', label: 'Token' },
    { key: 'name', label: 'Name' },
    { key: 'qty', label: 'Qty' },
    { key: 'price', label: 'Price ($)' },
    { key: 'value', label: 'Value ($)' },
  ]

  const salesColumns = [
    { key: 'date', label: 'Date' },
    { key: 'token', label: 'Token' },
    { key: 'amount', label: 'Amount ($)' },
  ]

  return {
    portfolioRows,
    salesRows,
    portfolioTotal,
    salesTotal,
    portfolioColumns,
    salesColumns,
  }
}

