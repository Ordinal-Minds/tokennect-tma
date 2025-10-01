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

// Storage keys used by @tonconnect/ui; clearing them forces a fresh session.
const TONCONNECT_KEYS = [
  'ton-connect-storage_bridge__lastWalletInfo',
  'ton-connect-storage_wallet__connectRequests',
  'ton-connect-storage_wallet__lastEventId',
  'ton-connect-ui__wallet',
  'ton-connect-ui__last-wallet',
]

export function useTonConnect() {
  const connected = ref(false)
  const address = ref<string | null>(null)
  const wallet = shallowRef<WalletInfo | null>(null)
  const ready = ref(false)

  async function ensureInstance() {
    if (typeof window === 'undefined') return null
    // For demo: always invalidate any previous TonConnect session on reload
    // so the "Connect" button can be used repeatedly without sticky state.
    if (!tcui) {
      try {
        TONCONNECT_KEYS.forEach((k) => localStorage.removeItem(k))
      } catch {}
    }
    if (!tcui) {
      const mod = await import('@tonconnect/ui')
      const { TonConnectUI } = mod as any
      const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`
      const isTWA = !!(window as any)?.Telegram?.WebApp
      tcui = new TonConnectUI({
        manifestUrl,
        uiPreferences: { theme: (document.documentElement as any)?.classList?.contains('dark') ? 'DARK' : 'LIGHT' },
        actionsConfiguration: {
          // In Telegram Mini Apps, use QR-less list/modal suitable for in-app wallet
          modals: isTWA ? ['ios', 'twa'] as any : undefined
        }
      })
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
      // Always disconnect any prior session to avoid SDK "already connected" errors
      try { await ui.disconnect() } catch {}
      try { TONCONNECT_KEYS.forEach((k) => localStorage.removeItem(k)) } catch {}
      wallet.value = null
      address.value = null
      connected.value = false
      // Open TonConnect UI modal (auto-picks Telegram Wallet inside TWA)
      const isTWA = !!(window as any)?.Telegram?.WebApp
      if (isTWA && ui.openSingleWalletModal) {
        // Prefer the built-in Telegram Wallet flow in TWA
        await ui.openSingleWalletModal('telegram-wallet')
      } else {
        await ui.openModal()
      }
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
      // Also nuke any cached state to ensure clean next connect
      try {
        TONCONNECT_KEYS.forEach((k) => localStorage.removeItem(k))
      } catch {}
      wallet.value = null
      address.value = null
      connected.value = false
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
