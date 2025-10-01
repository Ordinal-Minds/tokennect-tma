import { computed } from 'vue'

export function useTma() {
  const isClient = typeof window !== 'undefined'
  const token = computed(() => (isClient ? window.localStorage?.getItem('TMA_JWT') || null : null))
  const userId = computed(() => (isClient ? window.localStorage?.getItem('TMA_USER_ID') || null : null))
  const enabled = computed(() => {
    if (!isClient) return false
    return document.documentElement.classList.contains('tma-mode') || Boolean((window as any)?.__TMA__?.enabled)
  })
  return { enabled, token, userId }
}
