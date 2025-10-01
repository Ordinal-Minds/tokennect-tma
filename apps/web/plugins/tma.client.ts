import type { TelegramMiniAppUser } from '~/utils/tma'

// Lazy import to avoid pulling analytics in non‑TMA sessions unnecessarily
let telegramAnalytics: any

function isDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const qp = new URLSearchParams(window.location.search)
    if (qp.has('tma-debug') || qp.get('debug') === 'tma') return true
    const ls = window.localStorage?.getItem('TMA_DEBUG')
    if (ls === '1' || ls === 'true') return true
    const env = (import.meta as any).env?.VITE_TMA_DEBUG
    return env === '1' || env === 'true'
  } catch {
    return false
  }
}

const D = {
  log: (...a: any[]) => {
    if (!isDebugEnabled()) return
    try {
      // eslint-disable-next-line no-console
      console.log('[TMA]', ...a)
    } catch {}
  },
  warn: (...a: any[]) => {
    if (!isDebugEnabled()) return
    try {
      // eslint-disable-next-line no-console
      console.warn('[TMA]', ...a)
    } catch {}
  }
}

// Enable TMA mode by default. We still support forcing via query, but
// the baseline is now "on" even outside Telegram.
function isTmaEnv(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const qp = new URLSearchParams(window.location.search)
    const forced = qp.has('tma') || qp.has('tgWebApp') || qp.get('mode') === 'tma'
    const tg = (window as any)?.Telegram?.WebApp
    const hasInitData = typeof tg?.initData === 'string' && tg.initData.length > 0
    const result = true // default enabled
    D.log('Env check (default-enabled)', { forced, hasInitData, result })
    return result
  } catch {
    return true
  }
}

// Treat non-Telegram environments as forced TMA so we install a mock.
function isForcedTma(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return true
  } catch {
    return true
  }
}

async function initAnalyticsIfPossible() {
  try {
    if (!isTmaEnv()) return
    const w = window as any
    if (w.__tmaAnalyticsInit) return

    // Nuxt: Optionally allow config via public runtime (if you add it)
    // Using VITE_ var fallback to avoid import changes
    const token = (import.meta as any).env?.VITE_TMA_ANALYTICS_TOKEN
    const appName = (import.meta as any).env?.VITE_TMA_ANALYTICS_APP || 'miniapp'
    if (!token) {
      D.warn('Analytics token missing (VITE_TMA_ANALYTICS_TOKEN)')
      return
    }

    if (!telegramAnalytics) {
      telegramAnalytics = (await import('@telegram-apps/analytics')).default
    }
    D.log('Init analytics', { appName })
    telegramAnalytics.init({ token, appName })
    w.__tmaAnalyticsInit = true
  } catch (e) {
    D.warn('Failed to init TMA analytics', e)
  }
}

function prepareTmaShell() {
  try {
    if (!isTmaEnv()) return
    // If forced TMA and no real Telegram, install a mock
    const w = window as any
    if (isForcedTma() && !(w.Telegram?.WebApp)) {
      const idFromLs = Number(window.localStorage.getItem('TMA_MOCK_UID') || '0') || Math.floor(100000 + Math.random() * 900000)
      const usernameFromLs = window.localStorage.getItem('TMA_MOCK_USERNAME') || `mockuser${String(idFromLs).slice(-4)}`
      window.localStorage.setItem('TMA_MOCK_UID', String(idFromLs))
      window.localStorage.setItem('TMA_MOCK_USERNAME', usernameFromLs)
      const mockUser = {
        id: idFromLs,
        first_name: 'Mock',
        last_name: 'User',
        username: usernameFromLs,
        photo_url: undefined
      }
      w.Telegram = {
        WebApp: {
          initData: 'MOCK',
          initDataUnsafe: { user: mockUser, start_param: null },
          platform: 'web',
          version: '0.0-mock',
          ready: () => {},
          expand: () => {},
          onEvent: () => {}
        }
      }
      w.__TMA_MOCK__ = true
      D.log('Installed mock Telegram.WebApp', { uid: idFromLs, username: usernameFromLs })
    }
    const tg = (window as any)?.Telegram?.WebApp
    if (tg) {
      D.log('WebApp present', {
        version: tg.version,
        platform: tg.platform,
        colorScheme: tg.colorScheme,
        themeParams: tg.themeParams
      })
      try {
        tg.ready?.()
      } catch {}
      try {
        tg.expand?.()
      } catch {}
      try {
        const applyHeightVar = () => {
          const h = (tg as any)?.viewportStableHeight || (tg as any)?.viewportHeight
          if (typeof h === 'number' && h > 0) {
            document.documentElement.style.setProperty('--tg-viewport-height', `${Math.round(h)}px`)
          }
        }
        applyHeightVar()
        tg.onEvent?.('viewportChanged', applyHeightVar)
      } catch {}
      try {
        const bg = tg.themeParams?.bg_color
        if (bg) document.documentElement.style.setProperty('--tma-bg', `#${bg}`)
      } catch {}
    } else {
      D.warn('Telegram.WebApp not found. If testing in Telegram, ensure SDK loaded.')
    }
    document.documentElement.classList.add('tma-mode')
    ;(window as any).__TMA__ = { enabled: true }
    ;(window as any).__TMA_DEBUG__ = { enabled: isDebugEnabled() }
  } catch {}
}

async function devLoginViaMockIfPossible(apiBase: string, devSecret: string | undefined) {
  try {
    if (!(window as any)?.__TMA_MOCK__) return false
    if (!devSecret) {
      D.warn('Missing NUXT_PUBLIC_TMA_DEV_SECRET for mock TMA dev login')
      return false
    }
    const mockUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user
    const url = apiBase.replace(/\/$/, '') + '/telegram/devLogin'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: devSecret, user: mockUser }),
      credentials: 'omit'
    })
    if (!res.ok) {
      D.warn('devLogin failed', { status: res.status, statusText: res.statusText })
      return false
    }
    const data = await res.json().catch(() => null as any)
    const userId: string | undefined = data?.userId
    const token: string | undefined = data?.token
    if (!userId || !token) return false
    localStorage.setItem('TMA_JWT', token)
    localStorage.setItem('TMA_USER_ID', userId)
    try { window.dispatchEvent(new CustomEvent('tma:jwt', { detail: { token, userId } })) } catch {}
    sessionStorage.setItem('tmaWebAppLoginDone', '1')
    D.log('Dev mock login complete', { userId })
    return true
  } catch (e) {
    D.warn('Exception during devLogin', e)
    return false
  }
}

async function loginViaWebAppIfPossible(apiBase: string, devSecret: string | undefined) {
  try {
    if (!isTmaEnv()) {
      D.log('Skip WebApp login: not in TMA env')
      return false
    }
    let tries = 0
    while (!(window as any)?.Telegram?.WebApp && tries < 20) {
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    if (!(window as any)?.Telegram?.WebApp) {
      D.warn('Telegram.WebApp still undefined after wait')
    }
    if (localStorage.getItem('TMA_JWT')) {
      D.log('Skip WebApp login: JWT already present')
      return true
    }
    if (sessionStorage.getItem('tmaWebAppLoginDone') && localStorage.getItem('TMA_JWT')) {
      D.log('Skip WebApp login: already completed this session')
      return true
    }
    await new Promise((r) => setTimeout(r, 60))
    const tg = (window as any)?.Telegram?.WebApp
    const initData: string | undefined = tg?.initData
    if (!initData || initData.length < 16) {
      D.warn('WebApp.initData missing or too short', { hasTg: !!tg, initDataLen: initData?.length || 0 })
      // Try dev mock login fallback
      const okDev = await devLoginViaMockIfPossible(apiBase, devSecret)
      return okDev
    }
    D.log('Have initData', { len: initData.length, platform: tg?.platform, version: tg?.version })

    const url = apiBase.replace(/\/$/, '') + '/telegram/webAppLogin'
    D.log('POST webAppLogin', { url, base: apiBase })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        startParam: tg?.initDataUnsafe?.start_param || undefined,
        initDataUnsafe: tg?.initDataUnsafe || undefined,
        platform: tg?.platform || undefined,
        version: tg?.version || undefined
      }),
      credentials: 'omit'
    })
    if (!res.ok) {
      D.warn('webAppLogin failed', { status: res.status, statusText: res.statusText })
      return false
    }
    const data = await res.json().catch(() => null as any)
    const userId: string | undefined = data?.userId || data?.user_id || data?.uid
    const token: string | undefined = data?.token || data?.jwt
    if (!userId || !token) {
      D.warn('webAppLogin missing fields', { userId: !!userId, token: !!token })
      return false
    }
    localStorage.setItem('TMA_JWT', token)
    localStorage.setItem('TMA_USER_ID', userId)
    try { window.dispatchEvent(new CustomEvent('tma:jwt', { detail: { token, userId } })) } catch {}
    sessionStorage.setItem('tmaWebAppLoginDone', '1')
    D.log('Applied server session via webAppLogin', { userId })
    return true
  } catch (e) {
    D.warn('Exception during webAppLogin', e)
    return false
  }
}

export default defineNuxtPlugin(async () => {
  if (typeof window === 'undefined') return
  const config = useRuntimeConfig()
  const apiBase = ((config.public.apiBase as string) || 'http://localhost:3001').replace(/\/$/, '')
  prepareTmaShell()
  await initAnalyticsIfPossible()

  try {
    if (!isTmaEnv()) return
    // Clear any stale token for fresh TMA session
    localStorage.removeItem('TMA_JWT')
    try { window.dispatchEvent(new CustomEvent('tma:jwt-cleared')) } catch {}
  } catch {}

  try {
    if (!isTmaEnv()) return
    // Deep-start token bridge (e.g., /?t=<jwt>)
    if (!sessionStorage.getItem('tmaStartHandled')) {
      const qp = new URLSearchParams(window.location.search)
      const qpToken = qp.get('t') || qp.get('token') || null
      const sp: string | undefined = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.start_param
      const candidate = (qpToken || sp || '').trim()
      let token: string | null = null
      if (candidate) {
        const maybe = candidate.startsWith('t=') ? candidate.slice(2) : candidate
        if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(maybe)) token = maybe
      }
      D.log('Deep-start token probe', { hasQueryToken: !!qpToken, hasStartParam: !!sp, tokenDetected: !!token })
      if (token) {
        sessionStorage.setItem('tmaStartHandled', '1')
        localStorage.setItem('TMA_JWT', token)
        try { window.dispatchEvent(new CustomEvent('tma:jwt', { detail: { token } })) } catch {}
        return
      }
    }

    const ok = await loginViaWebAppIfPossible(apiBase, config.public.tmaDevSecret as string)
    if (!ok) D.warn('WebApp initData login did not complete')
  } catch {}
})
