import { ref, shallowRef, onMounted } from 'vue'

// Minimal TonConnect UI wrapper that works inside Telegram Mini Apps.
// Lazily loads the library on client and exposes connect/disconnect and address state.

type WalletAccount = {
  address: string
  chain: string
}

type WalletInfo = {
  device: unknown
  provider: unknown
  account?: WalletAccount
}

let tcui: any | null = null
let onStatusBound = false

export function useTonConnect() {
  const connected = ref(false)
  const address = ref<string | null>(null)
  const wallet = shallowRef<WalletInfo | null>(null)
  const ready = ref(false)

  async function ensureInstance() {
    if (typeof window === 'undefined') return null
    if (!tcui) {
      const mod = await import('@tonconnect/ui')
      const { TonConnectUI } = mod as any
      const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`
      tcui = new TonConnectUI({ manifestUrl })
      try {
        await tcui.connectionRestored
      } catch {}
    }
    if (tcui && !onStatusBound) {
      tcui.onStatusChange((w: WalletInfo | null) => {
        wallet.value = w
        const addr = w?.account?.address || null
        address.value = addr
        connected.value = !!addr
      })
      onStatusBound = true
    }
    ready.value = true
    return tcui
  }

  async function connect() {
    const ui = await ensureInstance()
    if (!ui) return
    try {
      // Open TonConnect UI modal (auto-picks Telegram Wallet inside TWA)
      await ui.openModal()
    } catch (e) {
      // noop; UI will surface errors
      console.warn('TonConnect openModal failed', e)
    }
  }

  async function disconnect() {
    const ui = await ensureInstance()
    if (!ui) return
    try {
      await ui.disconnect()
    } catch (e) {
      console.warn('TonConnect disconnect failed', e)
    }
  }

  // Optional: send a simple TON transfer via connected wallet
  async function sendTon(to: string, nanoAmount: string, payloadBase64?: string) {
    const ui = await ensureInstance()
    if (!ui) throw new Error('TonConnect not ready')
    const validUntil = Math.floor(Date.now() / 1000) + 300 // 5 minutes
    const tx = {
      validUntil,
      messages: [
        {
          address: to,
          amount: nanoAmount,
          ...(payloadBase64 ? { payload: payloadBase64 } : {})
        }
      ]
    }
    return ui.sendTransaction(tx)
  }

  onMounted(() => {
    // Kick off lazy init but do not block UI
    ensureInstance().catch(() => {})
  })

  return { connected, address, wallet, ready, connect, disconnect, sendTon }
}

