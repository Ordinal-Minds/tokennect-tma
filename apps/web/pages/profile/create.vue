<script setup lang="ts">
import type { ProfileData, ProfileLinks } from '~/composables/useProfile'

const router = useRouter()
const { profile, save } = useProfile()

const initial: ProfileData = profile.value ?? {
  displayName: 'Ada Lovelace',
  username: 'adal',
  avatarUrl: `https://i.pravatar.cc/200?u=adal-${Math.random().toString(36).slice(2)}`,
  tagline: 'Building autonomous agents for finance',
  location: 'London, UK',
  bio: 'Engineer + founder. I like shipping fast, then iterating even faster. Focused on agentic workflows and product-market fit loops.',
  interests: ['AI', 'Trading', 'TON', 'Product'],
  links: { website: 'https://example.com', twitter: 'https://x.com/adal', telegram: 'https://t.me/adal' },
  joinedAt: new Date().toISOString(),
  followers: 1258,
  following: 384,
  posts: 42
}

const displayName = ref(initial.displayName)
const username = ref(initial.username)
const avatarUrl = ref(initial.avatarUrl)
const tagline = ref(initial.tagline || '')
const location = ref(initial.location || '')
const bio = ref(initial.bio || '')
const interests = ref<string[]>([...initial.interests])
const linkWebsite = ref(initial.links.website || '')
const linkTwitter = ref(initial.links.twitter || '')
const linkTelegram = ref(initial.links.telegram || '')

const newInterest = ref('')
const adding = ref(false)

const avatarChoices = [
  'https://i.pravatar.cc/200?u=tokennect-1',
  'https://i.pravatar.cc/200?u=tokennect-2',
  'https://i.pravatar.cc/200?u=tokennect-3',
  'https://i.pravatar.cc/200?u=tokennect-4',
  'https://i.pravatar.cc/200?u=tokennect-5'
]

const handle = computed(() => username.value.trim().replace(/[^a-z0-9_]/gi, '').toLowerCase())
const isValid = computed(() => displayName.value.trim().length >= 2 && handle.value.length >= 2)

function addInterest() {
  const v = newInterest.value.trim()
  if (!v) return
  if (!interests.value.includes(v)) interests.value.push(v)
  newInterest.value = ''
}

function removeInterest(tag: string) {
  interests.value = interests.value.filter((t) => t !== tag)
}

async function accept() {
  if (!isValid.value) return
  adding.value = true
  const data: ProfileData = {
    displayName: displayName.value.trim(),
    username: handle.value,
    avatarUrl: avatarUrl.value.trim(),
    tagline: tagline.value.trim() || undefined,
    location: location.value.trim() || undefined,
    bio: bio.value.trim() || undefined,
    interests: interests.value,
    links: (() => {
      const links: ProfileLinks = {}
      const w = linkWebsite.value.trim()
      const x = linkTwitter.value.trim()
      const t = linkTelegram.value.trim()
      if (w) links.website = w
      if (x) links.twitter = x
      if (t) links.telegram = t
      return links
    })(),
    joinedAt: initial.joinedAt,
    followers: initial.followers,
    following: initial.following,
    posts: initial.posts
  }
  save(data)
  await router.push('/profile')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Create Profile</h1>
        <p class="text-sm text-gray-500">Add your details to finish setup</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton color="gray" variant="ghost" to="/profile" v-if="profile">View profile</UButton>
        <UButton color="primary" :disabled="!isValid" :loading="adding" @click="accept">Accept</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Form -->
      <UCard class="!bg-card !border-border">
        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <UAvatar :src="avatarUrl" size="lg" alt="Avatar" class="ring-2 ring-gray-200" />
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UButton
                v-for="a in avatarChoices"
                :key="a"
                color="gray"
                variant="soft"
                @click="avatarUrl = a"
                :class="['justify-start', avatarUrl === a ? '!bg-gray-200' : '']"
              >
                <UAvatar :src="a" size="xs" class="mr-2" /> Use avatar
              </UButton>
            </div>
          </div>

          <UFormGroup label="Avatar URL" hint="Paste a direct image URL" size="sm">
            <UInput v-model="avatarUrl" placeholder="https://..." />
          </UFormGroup>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormGroup label="Display name" required>
              <UInput v-model="displayName" placeholder="Your full name" />
            </UFormGroup>
            <UFormGroup label="Username" hint="Lowercase, no spaces" required>
              <UInput v-model="username" placeholder="handle" />
              <p class="mt-1 text-xs text-gray-500">@{{ handle }}</p>
            </UFormGroup>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormGroup label="Tagline">
              <UInput v-model="tagline" placeholder="What do you do?" />
            </UFormGroup>
            <UFormGroup label="Location">
              <UInput v-model="location" placeholder="City, Country" />
            </UFormGroup>
          </div>

          <UFormGroup label="Bio">
            <UTextarea v-model="bio" :rows="5" placeholder="Tell people about yourself..." />
          </UFormGroup>

          <div>
            <label class="block text-sm font-medium mb-1">Interests</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <UBadge v-for="tag in interests" :key="tag" variant="soft" class="gap-2">
                {{ tag }}
                <UButton size="2xs" color="gray" variant="ghost" aria-label="Remove" @click="removeInterest(tag)">×</UButton>
              </UBadge>
            </div>
            <div class="flex gap-2">
              <UInput v-model="newInterest" placeholder="Add interest and press Enter" @keydown.enter.prevent="addInterest" />
              <UButton color="gray" variant="soft" @click="addInterest">Add</UButton>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UFormGroup label="Website">
              <UInput v-model="linkWebsite" placeholder="https://example.com" />
            </UFormGroup>
            <UFormGroup label="Twitter/X">
              <UInput v-model="linkTwitter" placeholder="https://x.com/you" />
            </UFormGroup>
            <UFormGroup label="Telegram">
              <UInput v-model="linkTelegram" placeholder="https://t.me/you" />
            </UFormGroup>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="primary" :disabled="!isValid" :loading="adding" @click="accept">Accept</UButton>
          </div>
        </template>
      </UCard>

      <!-- Live Preview -->
      <div class="space-y-4">
        <UCard class="!bg-card !border-border">
          <div class="flex items-start gap-4">
            <UAvatar :src="avatarUrl" size="xl" class="ring-2 ring-gray-200" />
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-semibold leading-tight">{{ displayName }}</h2>
                <UBadge color="gray">@{{ handle }}</UBadge>
              </div>
              <p v-if="tagline" class="text-gray-600 mt-0.5">{{ tagline }}</p>
              <div v-if="location" class="text-sm text-gray-500 mt-1">{{ location }}</div>
              <div class="flex items-center gap-3 mt-3 text-sm">
                <span class="text-gray-700"><strong>{{ initial.followers }}</strong> Followers</span>
                <span class="text-gray-500">•</span>
                <span class="text-gray-700"><strong>{{ initial.following }}</strong> Following</span>
                <span class="text-gray-500">•</span>
                <span class="text-gray-700"><strong>{{ initial.posts }}</strong> Posts</span>
              </div>
            </div>
          </div>
          <p v-if="bio" class="mt-4 text-gray-800">{{ bio }}</p>
          <div v-if="interests.length" class="mt-4 flex flex-wrap gap-2">
            <UBadge v-for="tag in interests" :key="tag" color="primary" variant="soft">{{ tag }}</UBadge>
          </div>
          <div class="mt-6 flex flex-wrap gap-2">
            <UButton v-if="linkTelegram" :to="linkTelegram" target="_blank" color="primary" variant="solid">Message on Telegram</UButton>
            <UButton v-if="linkTwitter" :to="linkTwitter" target="_blank" color="gray" variant="outline">View on X</UButton>
            <UButton v-if="linkWebsite" :to="linkWebsite" target="_blank" color="gray" variant="soft">Website</UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
