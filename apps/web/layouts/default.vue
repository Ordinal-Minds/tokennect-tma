<script setup lang="ts">
const route = useRoute()
import { getTelegramMiniAppUser, getTelegramProfilePhoto } from '~/utils/tma'

const nav = [
  { label: 'Dashboard', to: '/' },
  { label: 'Profile', to: '/profile' },
  { label: 'Token', to: '/token' },
  { label: 'Bot Setup', to: '/bot' },
  { label: 'Live Feed', to: '/feed' },
  { label: 'Portfolio / Sales', to: '/portfolio' },
]

const user = reactive({
  name: 'Satoshi Nakamoto',
  username: '',
  avatar: 'https://i.pravatar.cc/64?u=Tokennect',
})

const { profile, hasProfile } = useProfile()

const mobileOpen = ref(false)
const linkedFromTelegram = ref(false)

onMounted(() => {
  // Prefer local profile if available for the header
  if (hasProfile.value && profile.value) {
    user.name = profile.value.displayName
    user.username = profile.value.username
    user.avatar = profile.value.avatarUrl
  }
  const tUser = getTelegramMiniAppUser()
  if (tUser) {
    const display = [tUser.first_name, tUser.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (!hasProfile.value) {
      user.name = display || tUser.username || user.name
      if (tUser.username) user.username = tUser.username
      const photo = getTelegramProfilePhoto()
      if (photo) user.avatar = photo
    }
    linkedFromTelegram.value = true
  }
})

const isActive = (path: string) => route.path === path
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav class="sticky top-0 z-50 border-b bg-white/70 backdrop-blur">
      <UContainer class="py-3 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="font-semibold text-lg tracking-tight">
            Tokennect
          </NuxtLink>
          <!-- Mobile menu button -->
          <UButton
            class="md:hidden"
            color="gray"
            variant="ghost"
            size="sm"
            aria-label="Open navigation menu"
            @click="mobileOpen = true"
          >
            Menu
          </UButton>
          <div class="hidden md:flex items-center gap-1">
            <ULink
              v-for="item in nav"
              :key="item.to"
              :to="item.to"
              class="px-3 py-1.5 rounded-md text-sm"
              :class="
                isActive(item.to)
                  ? 'bg-muted text-foreground'
                  : 'text-gray-600 hover:text-foreground hover:bg-muted'
              "
            >
              {{ item.label }}
            </ULink>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 max-w-[40vw]">
            <span
              v-if="linkedFromTelegram"
              class="inline-flex items-center flex-none shrink-0"
              title="Linked via Telegram"
              aria-label="Linked via Telegram"
            >
              <!-- Telegram logo (Simple Icons) -->
              <svg
                class="h-4 w-4 text-[#26A5E4]"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                />
              </svg>
            </span>
            <span
              class="text-sm text-gray-700 truncate"
              :title="user.username ? '@' + user.username : user.name"
            >
              {{ user.username ? '@' + user.username : user.name }}
            </span>
          </div>
          <UAvatar :src="user.avatar" size="sm" :alt="user.name || 'Profile'" />
        </div>
      </UContainer>
    </nav>

    <!-- Mobile slide-over navigation -->
    <USlideover
      v-model="mobileOpen"
      side="left"
      :ui="{ width: 'max-w-xs' }"
      aria-label="Navigation"
    >
      <div class="p-4 flex flex-col h-full">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <UAvatar
              :src="user.avatar"
              size="sm"
              :alt="user.name || 'Profile'"
            />
            <div class="text-sm">
              <div class="font-medium leading-tight">{{ user.name }}</div>
              <div class="text-gray-500" v-if="user.username">
                @{{ user.username }}
              </div>
            </div>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            size="sm"
            aria-label="Close menu"
            @click="mobileOpen = false"
            >Close</UButton
          >
        </div>

        <nav class="flex-1 space-y-1">
          <ULink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="block px-3 py-2 rounded-md text-sm"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="
              isActive(item.to)
                ? 'bg-muted text-foreground'
                : 'text-gray-700 hover:text-foreground hover:bg-muted'
            "
            @click="mobileOpen = false"
          >
            {{ item.label }}
          </ULink>
        </nav>

        <div class="pt-2 mt-auto text-xs text-gray-400">Tokennect</div>
      </div>
    </USlideover>

    <main class="flex-1">
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </main>
  </div>
</template>
