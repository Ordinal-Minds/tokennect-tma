import { onMounted, onUnmounted, reactive, ref, watch, type Ref, computed } from 'vue'

export type DemoToken = {
  id: string
  symbol: string
  totalSupply: string | number
}

export type DemoTxType = 'BUY' | 'SELL' | 'TRANSFER' | 'AIRDROP'

export type DemoTx = {
  id: string
  ts: number
  type: DemoTxType
  from: string
  to: string
  amount: number
  priceUsd: number
  txHash: string
}

type Persisted = {
  lastTick: number
  priceUsd: number
  txs: DemoTx[]
  holders: Record<string, number>
  seriesTx: number[]
  seriesHolders: number[]
}

function keyFor(tokenId: string) { return `DEMO_TOKEN_FEED:${tokenId}` }

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function fakeAddr(prefix: string = 'EQ') {
  const bytes = crypto.getRandomValues(new Uint8Array(22))
  const base = Array.from(bytes).map(b => (b % 16).toString(16)).join('').slice(0, 44)
  return `${prefix}${base}`
}

function fakeHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useDemoTokenFeed(tokenRef: Ref<DemoToken | null>) {
  const running = ref(false)
  const tickMs = ref(1400)
  let timer: number | NodeJS.Timeout | null = null

  const priceUsd = ref(0.001)
  const seriesPrice = ref<number[]>(Array.from({ length: 30 }, (_, i) => 0.001 + i * 0.00002))
  const txs = ref<DemoTx[]>([])
  const holders = ref<Record<string, number>>({})
  const seriesTx = ref<number[]>(Array.from({ length: 12 }, () => 0))
  const seriesHolders = ref<number[]>(Array.from({ length: 12 }, () => 0))

  const topHolders = computed(() => {
    const entries = Object.entries(holders.value)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return entries.map(([addr, bal]) => ({ addr, bal }))
  })

  const transactions = computed(() => txs.value.length)
  const holdersCount = computed(() => Object.values(holders.value).filter(v => v > 0).length)
  const circulating = computed(() => Object.values(holders.value).reduce((s, v) => s + Math.max(0, v), 0))
  const tvlTon = computed(() => Math.round((circulating.value / Math.max(1, Number(tokenRef.value?.totalSupply || 1))) * 200 * 100) / 100)

  function pushTx(tx: DemoTx) {
    txs.value.unshift(tx)
    if (txs.value.length > 60) txs.value.pop()
  }

  function applyDelta(addr: string, delta: number) {
    const cur = holders.value[addr] || 0
    holders.value[addr] = Math.max(0, cur + delta)
  }

  function simulateBuy() {
    const tok = tokenRef.value
    if (!tok) return null
    const supply = Number(tok.totalSupply)
    const amount = Math.max(1, Math.floor(supply * randFloat(0.00001, 0.0005)))
    const to = fakeAddr()
    applyDelta(to, amount)
    const drift = randFloat(0.5, 2.0) // %
    priceUsd.value = Math.max(0.00001, priceUsd.value * (1 + drift / 100))
    const tx: DemoTx = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: 'BUY',
      from: fakeAddr('EQA'),
      to,
      amount,
      priceUsd: priceUsd.value,
      txHash: fakeHash(),
    }
    pushTx(tx)
    return tx
  }

  function simulateSell() {
    const addrs = Object.keys(holders.value).filter(a => (holders.value[a] || 0) > 0)
    if (addrs.length === 0) return null
    const from = addrs[randInt(0, addrs.length - 1)]!
    const bal = holders.value[from]!
    const amount = Math.max(1, Math.floor(Math.min(bal, bal * randFloat(0.01, 0.2))))
    applyDelta(from, -amount)
    const to = fakeAddr('EQA')
    const drift = randFloat(0.2, 1.2) // % down
    priceUsd.value = Math.max(0.00001, priceUsd.value * (1 - drift / 100))
    const tx: DemoTx = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: 'SELL',
      from,
      to,
      amount,
      priceUsd: priceUsd.value,
      txHash: fakeHash(),
    }
    pushTx(tx)
    return tx
  }

  function simulateAirdrop(count = randInt(2, 6)) {
    const tok = tokenRef.value
    if (!tok) return []
    const supply = Number(tok.totalSupply)
    const out: DemoTx[] = []
    for (let i = 0; i < count; i++) {
      const to = fakeAddr()
      const amount = Math.max(1, Math.floor(supply * randFloat(0.000005, 0.00005)))
      applyDelta(to, amount)
      const tx: DemoTx = {
        id: crypto.randomUUID(), ts: Date.now(), type: 'AIRDROP', from: 'AIRDROP', to, amount, priceUsd: priceUsd.value, txHash: fakeHash()
      }
      pushTx(tx)
      out.push(tx)
    }
    return out
  }

  function stepRandom() {
    // Random walk tendency upward
    const dir = Math.random() < 0.6 ? 1 : -1
    priceUsd.value = Math.max(0.00001, priceUsd.value * (1 + dir * randFloat(0.05, 0.5) / 100))
  }

  function tick() {
    if (!tokenRef.value) return
    let txCount = 0
    const r = Math.random()
    if (r < 0.55) { simulateBuy(); txCount++ }
    else if (r < 0.85) { if (simulateSell()) txCount++ } 
    else { txCount += simulateAirdrop(randInt(1, 3)).length }

    // Append series
    seriesTx.value.push(txCount)
    if (seriesTx.value.length > 30) seriesTx.value.shift()
    seriesHolders.value.push(holdersCount.value)
    if (seriesHolders.value.length > 30) seriesHolders.value.shift()

    // Price evolution
    stepRandom()
    seriesPrice.value.push(priceUsd.value)
    if (seriesPrice.value.length > 60) seriesPrice.value.shift()

    persist()
  }

  function persist() {
    const tok = tokenRef.value
    if (!tok) return
    const payload: Persisted = {
      lastTick: Date.now(),
      priceUsd: priceUsd.value,
      txs: txs.value,
      holders: holders.value,
      seriesTx: seriesTx.value,
      seriesHolders: seriesHolders.value,
    }
    try { localStorage.setItem(keyFor(tok.id), JSON.stringify(payload)) } catch {}
  }

  function restore() {
    const tok = tokenRef.value
    if (!tok) return
    try {
      const raw = localStorage.getItem(keyFor(tok.id))
      if (!raw) return
      const parsed = JSON.parse(raw) as Persisted
      priceUsd.value = parsed.priceUsd || 0.001
      txs.value = parsed.txs || []
      holders.value = parsed.holders || {}
      seriesTx.value = parsed.seriesTx || seriesTx.value
      seriesHolders.value = parsed.seriesHolders || seriesHolders.value
    } catch {}
  }

  function start() {
    if (running.value || !tokenRef.value) return
    running.value = true
    restore()
    timer = setInterval(tick, tickMs.value)
  }

  function stop() {
    running.value = false
    if (timer) { clearInterval(timer as any); timer = null }
  }

  function reset() {
    stop()
    priceUsd.value = 0.001
    txs.value = []
    holders.value = {}
    seriesTx.value = Array.from({ length: 12 }, () => 0)
    seriesHolders.value = Array.from({ length: 12 }, () => 0)
    persist()
  }

  onMounted(() => { if (tokenRef.value) start() })
  onUnmounted(stop)
  watch(tokenRef, (t) => { if (t) start(); else stop() })

  return {
    // state
    priceUsd,
    seriesPrice,
    txs,
    holders,
    topHolders,
    seriesTx,
    seriesHolders,
    // computed stats
    transactions,
    holdersCount,
    circulating,
    tvlTon,
    // controls
    start,
    stop,
    reset,
    simulateBuy,
    simulateSell,
    simulateAirdrop,
  }
}
