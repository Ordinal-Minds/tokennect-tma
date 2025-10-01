import { computed } from 'vue'

type TgWebApp = any

export function useTelegram() {
  const toast = useToast()
  const tg = computed<TgWebApp | null>(() => {
    if (typeof window === 'undefined') return null
    return (window as any)?.Telegram?.WebApp || null
  })

  function ensure(message: string) {
    if (!tg.value) {
      toast.add({ title: 'Telegram placeholder', description: message })
      return false
    }
    return true
  }

  function showAlert(message: string) {
    if (!ensure(message)) return
    try {
      tg.value.showAlert?.(message)
    } catch {
      toast.add({ title: 'Telegram placeholder', description: message })
    }
  }

  async function showConfirm(message: string): Promise<boolean> {
    if (!tg.value) {
      // Placeholder fallback: use native confirm
      return Promise.resolve(window.confirm(message))
    }
    return new Promise<boolean>((resolve) => {
      try {
        tg.value.showConfirm?.(message, (ok: boolean) => resolve(!!ok))
      } catch {
        resolve(window.confirm(message))
      }
    })
  }

  function openLink(url: string, options?: { try_instant_view?: boolean }) {
    if (!ensure(`Open link: ${url}`)) return
    try {
      tg.value.openLink?.(url, options)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  function ready() {
    try {
      tg.value?.ready?.()
    } catch {}
  }

  function expand() {
    try {
      tg.value?.expand?.()
    } catch {}
  }

  return {
    tg,
    showAlert,
    showConfirm,
    openLink,
    ready,
    expand
  }
}

