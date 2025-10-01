export function isTmaMode(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if ((window as any)?.__TMA__?.enabled) return true
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('tma-mode')) return true
    const tg = (window as any)?.Telegram?.WebApp
    if (typeof tg?.initData === 'string' && tg.initData.length > 0) return true
    return false
  } catch {
    return false
  }
}

export interface TelegramMiniAppUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  added_to_attachment_menu?: boolean
  allows_write_to_pm?: boolean
  photo_url?: string
}

export function getTelegramMiniAppUser(): TelegramMiniAppUser | null {
  try {
    if (typeof window === 'undefined') return null
    const tg = (window as any)?.Telegram?.WebApp
    const user = tg?.initDataUnsafe?.user
    if (user && typeof user === 'object') return user as TelegramMiniAppUser
  } catch {}
  return null
}

export function getTelegramProfilePhoto(): string | null {
  const user = getTelegramMiniAppUser()
  const candidate = (user as any)?.photo_url || (user as any)?.photoUrl || (user as any)?.photo
  if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
  return null
}

