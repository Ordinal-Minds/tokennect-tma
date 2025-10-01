import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export function useTma() {
  const isClient = typeof window !== 'undefined'
  const token = ref<string | null>(null)
  const userId = ref<string | null>(null)

  const readStorage = () => {
    if (!isClient) return
    token.value = window.localStorage?.getItem('TMA_JWT') || null
    userId.value = window.localStorage?.getItem('TMA_USER_ID') || null
  }

  onMounted(() => {
    readStorage()
    const onStorage = (e: StorageEvent) => {
      if (!e) return
      if (e.key === 'TMA_JWT' || e.key === 'TMA_USER_ID' || e.key === null) readStorage()
    }
    const onJwtEvent = () => readStorage()
    window.addEventListener('storage', onStorage)
    window.addEventListener('tma:jwt', onJwtEvent as EventListener)
    window.addEventListener('tma:jwt-cleared', onJwtEvent as EventListener)
    onBeforeUnmount(() => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('tma:jwt', onJwtEvent as EventListener)
      window.removeEventListener('tma:jwt-cleared', onJwtEvent as EventListener)
    })
  })

  const enabled = computed(() => {
    if (!isClient) return false
    return document.documentElement.classList.contains('tma-mode') || Boolean((window as any)?.__TMA__?.enabled)
  })
  return { enabled, token, userId }
}
