import { onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue'

export type SimToken = {
  id: string
  symbol: string
  totalSupply: string | number
}

export type DemoTokenSim = {
  // aggregate counters
  transactions: number
  holders: number
  circulating: number
  tvlTon: number
  // series for simple sparkline charts
  seriesTx: number[]
  seriesHolders: number[]
}

type PersistedState = {
  startedAt: string
  lastTick: number
  data: DemoTokenSim
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function keyFor(tokenId: string) {
  return `DEMO_TOKEN_SIM:${tokenId}`
}

export function useDemoTokenSim(tokenRef: Ref<SimToken | null>) {
  const running = ref(false)
  const tickMs = 1500
  const timer = ref<number | NodeJS.Timeout | null>(null)
  const state = reactive<DemoTokenSim>({
    transactions: 0,
    holders: 0,
    circulating: 0,
    tvlTon: 0,
    seriesTx: Array.from({ length: 12 }, () => 0),
    seriesHolders: Array.from({ length: 12 }, () => 0),
  })

  function persist() {
    const tok = tokenRef.value
    if (!tok) return
    const payload: PersistedState = {
      startedAt: new Date().toISOString(),
      lastTick: Date.now(),
      data: JSON.parse(JSON.stringify(state)),
    }
    try { localStorage.setItem(keyFor(tok.id), JSON.stringify(payload)) } catch {}
  }

  function restore() {
    const tok = tokenRef.value
    if (!tok) return
    try {
      const raw = localStorage.getItem(keyFor(tok.id))
      if (!raw) return
      const parsed = JSON.parse(raw) as PersistedState
      Object.assign(state, parsed.data)
      const elapsed = Date.now() - (parsed.lastTick || Date.now())
      const missed = Math.floor(elapsed / tickMs)
      if (missed > 0) runTicks(missed)
    } catch {}
  }

  function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function runTick() {
    runTicks(1)
  }

  function runTicks(n: number) {
    const tok = tokenRef.value
    if (!tok) return
    const supply = typeof tok.totalSupply === 'string' ? Number(tok.totalSupply) : tok.totalSupply
    for (let i = 0; i < n; i++) {
      // Transactions: small random bursts trending upward
      const txDelta = randInt(1, 6)
      state.transactions += txDelta

      // Holders: grow slowly; use a saturating curve toward an arbitrary cap
      const targetCap = Math.max(100, Math.min(50000, Math.floor(supply / 10000))) // heuristic
      const remaining = Math.max(0, targetCap - state.holders)
      const holderDelta = remaining > 0 ? Math.max(1, Math.floor(remaining * 0.01)) + randInt(0, 2) : 0
      state.holders = clamp(state.holders + holderDelta, 0, targetCap)

      // Circulating: increase toward supply; vary pace
      const circRemaining = Math.max(0, supply - state.circulating)
      const circDelta = circRemaining > 0 ? Math.max(1, Math.floor(circRemaining * 0.002)) + randInt(0, 500) : 0
      state.circulating = clamp(state.circulating + circDelta, 0, supply)

      // TVL in TON: rough function of circulating with noise
      const tvlBase = state.circulating / (supply || 1)
      const tvlRand = randInt(-2, 6)
      state.tvlTon = Math.max(0, Math.round((tvlBase * 200 + tvlRand) * 100) / 100) // up to ~200 TON

      // Every few ticks, append to series
      if ((state.transactions + i) % 5 === 0) {
        state.seriesTx.push(txDelta + randInt(0, 4))
        if (state.seriesTx.length > 30) state.seriesTx.shift()
        state.seriesHolders.push(state.holders)
        if (state.seriesHolders.length > 30) state.seriesHolders.shift()
      }
    }
    persist()
  }

  function start() {
    if (running.value || !tokenRef.value) return
    running.value = true
    restore()
    // ensure non-zero seeds after creation
    if (state.seriesTx.every((v) => v === 0)) state.seriesTx = Array.from({ length: 12 }, (_, i) => Math.max(0, i + randInt(0, 3)))
    if (state.seriesHolders.every((v) => v === 0)) state.seriesHolders = Array.from({ length: 12 }, (_, i) => i * randInt(1, 3))
    timer.value = setInterval(runTick, tickMs)
  }

  function stop() {
    running.value = false
    if (timer.value) {
      clearInterval(timer.value as any)
      timer.value = null
    }
  }

  // Lifecycle
  onMounted(() => {
    if (tokenRef.value) start()
  })
  onUnmounted(stop)

  // Start when token becomes available
  watch(tokenRef, (t) => {
    if (t) start()
    else stop()
  })

  return {
    state,
    start,
    stop,
    runTick,
  }
}
