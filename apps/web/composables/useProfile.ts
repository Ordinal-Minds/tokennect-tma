import { ref, computed, onMounted } from 'vue'

export interface ProfileLinks {
  website?: string | undefined
  twitter?: string | undefined
  telegram?: string | undefined
}

export interface ProfileData {
  displayName: string
  username: string
  avatarUrl: string
  tagline?: string | undefined
  location?: string | undefined
  bio?: string | undefined
  interests: string[]
  links: ProfileLinks
  joinedAt: string // ISO date
  // Demo stats (purely cosmetic)
  followers: number
  following: number
  posts: number
}

const STORAGE_KEY = 'DEMO_PROFILE_V1'

export function useProfile() {
  const profile = useState<ProfileData | null>('profile:data', () => null)
  const ready = ref(false)

  const hasProfile = computed(() => !!profile.value)

  const load = () => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as ProfileData
      // Basic shape check
      if (data && typeof data.displayName === 'string' && typeof data.username === 'string') {
        profile.value = data
      }
    } catch {
      // ignore
    }
  }

  const save = (data: ProfileData) => {
    profile.value = data
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }

  const clear = () => {
    profile.value = null
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  onMounted(() => {
    load()
    ready.value = true
  })

  return { profile, hasProfile, ready, save, clear, load }
}
