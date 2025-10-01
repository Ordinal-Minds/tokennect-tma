export function useDemoStats() {
  // Unique Agent Conversations over last 24 points (e.g., hours)
  const conversationsSeries = ref<number[]>([
    4, 6, 5, 7, 9, 8, 10, 9, 12, 14, 11, 13,
    15, 16, 14, 13, 12, 15, 18, 17, 19, 21, 20, 22,
  ])
  const conversationsCurrent = computed(() => {
    const vals = conversationsSeries.value
    return vals[vals.length - 1] ?? 0
  })
  const conversationsStart = computed(() => conversationsSeries.value[0] || 0)
  const conversationsDelta = computed(() => conversationsCurrent.value - conversationsStart.value)
  const conversationsDeltaPct = computed(() =>
    conversationsStart.value ? (conversationsDelta.value / conversationsStart.value) * 100 : 0,
  )

  // Active Portfolio total value over last 24 points (USD, demo)
  const base = 1083
  const deltas = [
    -12, 8, -6, 5, 9, -4, 6, 12, -7, 4, 3, -5,
    7, 10, -8, 4, 6, -3, 5, 9, -6, 4, 7, 11,
  ]
  const portfolioSeries = ref<number[]>(
    deltas.reduce<number[]>((acc, d) => {
      const prev = acc.length ? acc[acc.length - 1]! : base
      acc.push(Math.max(0, prev + d))
      return acc
    }, []),
  )
  const portfolioCurrent = computed(() => {
    const vals = portfolioSeries.value
    return vals[vals.length - 1] ?? 0
  })
  const portfolioStart = computed(() => portfolioSeries.value[0] || 0)
  const portfolioDelta = computed(() => portfolioCurrent.value - portfolioStart.value)
  const portfolioDeltaPct = computed(() =>
    portfolioStart.value ? (portfolioDelta.value / portfolioStart.value) * 100 : 0,
  )

  return {
    conversationsSeries,
    conversationsCurrent,
    conversationsDelta,
    conversationsDeltaPct,
    portfolioSeries,
    portfolioCurrent,
    portfolioDelta,
    portfolioDeltaPct,
  }
}
