<script setup lang="ts">
const route = useRoute()
import { getTelegramMiniAppUser, getTelegramProfilePhoto } from '~/utils/tma'

const nav = [
  { label: 'Dashboard', to: '/' },
  { label: 'Token', to: '/token' },
  { label: 'Bot Setup', to: '/bot' },
  { label: 'Live Feed', to: '/feed' },
  { label: 'Portfolio / Sales', to: '/portfolio' }
]

const user = reactive({
  name: 'Satoshi Nakamoto',
  username: '',
  avatar: 'https://i.pravatar.cc/64?u=tokenect'
})

const mobileOpen = ref(false)

onMounted(() => {
  const tUser = getTelegramMiniAppUser()
  if (tUser) {
    const display = [tUser.first_name, tUser.last_name].filter(Boolean).join(' ').trim()
    user.name = display || tUser.username || user.name
    if (tUser.username) user.username = tUser.username
    const photo = getTelegramProfilePhoto()
    if (photo) user.avatar = photo
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
            Tokenect
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
              :class="isActive(item.to) ? 'bg-muted text-foreground' : 'text-gray-600 hover:text-foreground hover:bg-muted'"
            >
              {{ item.label }}
            </ULink>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="block text-sm text-gray-700 max-w-[40vw] truncate"
            :title="user.username ? '@' + user.username : user.name"
          >
            {{ user.username ? '@' + user.username : user.name }}
          </span>
          <UAvatar :src="user.avatar" size="sm" :alt="user.name || 'Profile'" />
        </div>
      </UContainer>
    </nav>

    <!-- Mobile slide-over navigation -->
    <USlideover v-model="mobileOpen" side="left" :ui="{ width: 'max-w-xs' }" aria-label="Navigation">
      <div class="p-4 flex flex-col h-full">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <UAvatar :src="user.avatar" size="sm" :alt="user.name || 'Profile'" />
            <div class="text-sm">
              <div class="font-medium leading-tight">{{ user.name }}</div>
              <div class="text-gray-500" v-if="user.username">@{{ user.username }}</div>
            </div>
          </div>
          <UButton color="gray" variant="ghost" size="sm" aria-label="Close menu" @click="mobileOpen = false">Close</UButton>
        </div>

        <nav class="flex-1 space-y-1">
          <ULink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="block px-3 py-2 rounded-md text-sm"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="isActive(item.to) ? 'bg-muted text-foreground' : 'text-gray-700 hover:text-foreground hover:bg-muted'"
            @click="mobileOpen = false"
          >
            {{ item.label }}
          </ULink>
        </nav>

        <div class="pt-2 mt-auto text-xs text-gray-400">
          Tokenect
        </div>
      </div>
    </USlideover>

    <main class="flex-1">
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </main>
  </div>
  
</template>
