<script setup lang="ts">
const router = useRouter()
const { profile, hasProfile } = useProfile()
const { portfolioRows, portfolioTotal, portfolioColumns } = useDemoPortfolio()

function edit() {
  router.push('/profile/create')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Profile</h1>
        <p class="text-sm text-gray-500">Your public information</p>
      </div>
      <div v-if="hasProfile">
        <UButton color="primary" @click="edit">Edit Profile</UButton>
      </div>
    </div>

    <UCard v-if="!hasProfile" class="!bg-card !border-border">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-medium">No profile yet</h2>
          <p class="text-sm text-gray-600">Create your profile to personalize your account and share it with others.</p>
        </div>
        <UButton color="primary" to="/profile/create">Create Profile</UButton>
      </div>
    </UCard>

    <template v-else>
      <!-- Header / hero -->
      <UCard class="!bg-card !border-border">
        <div class="flex flex-col md:flex-row md:items-start gap-6">
          <UAvatar :src="profile!.avatarUrl" size="2xl" class="ring-2 ring-gray-200" />
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-2xl font-semibold leading-tight truncate">{{ profile!.displayName }}</h2>
              <UBadge color="gray">@{{ profile!.username }}</UBadge>
            </div>
            <p v-if="profile!.tagline" class="text-gray-700 mt-1">{{ profile!.tagline }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span v-if="profile!.location">📍 {{ profile!.location }}</span>
              <span>Joined {{ new Date(profile!.joinedAt).toLocaleDateString() }}</span>
            </div>
            <div class="mt-4 flex items-center gap-4 text-sm">
              <span><strong>{{ profile!.followers }}</strong> Followers</span>
              <span><strong>{{ profile!.following }}</strong> Following</span>
              <span><strong>{{ profile!.posts }}</strong> Posts</span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <UButton v-if="profile!.links.telegram" :to="profile!.links.telegram" target="_blank" color="primary">Message on Telegram</UButton>
              <UButton v-if="profile!.links.twitter" :to="profile!.links.twitter" target="_blank" color="gray" variant="outline">View on X</UButton>
              <UButton v-if="profile!.links.website" :to="profile!.links.website" target="_blank" color="gray" variant="soft">Website</UButton>
              <UButton color="gray" variant="soft" @click="edit">Edit</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- About -->
        <UCard class="!bg-card !border-border lg:col-span-2">
          <h3 class="text-lg font-medium">About</h3>
          <p v-if="profile!.bio" class="mt-2 text-gray-800 whitespace-pre-line">{{ profile!.bio }}</p>
          <p v-else class="mt-2 text-gray-500">No bio yet.</p>

          <div v-if="profile!.interests.length" class="mt-4">
            <div class="text-sm text-gray-500 mb-2">Interests</div>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="tag in profile!.interests" :key="tag" color="primary" variant="soft">{{ tag }}</UBadge>
            </div>
          </div>
        </UCard>

        <!-- Highlights / Stats -->
        <div class="space-y-4">
          <UCard class="!bg-card !border-border">
            <div class="text-sm text-gray-500">Portfolio Value (demo)</div>
            <div class="text-2xl font-semibold mt-1">${{ portfolioTotal.toFixed(0) }}</div>
            <div class="mt-2 text-xs text-gray-500">Simulated holdings for demo</div>
          </UCard>
          <UCard class="!bg-card !border-border">
            <div class="text-sm text-gray-500">Engagement</div>
            <div class="mt-2 flex items-center justify-between">
              <div class="text-center">
                <div class="text-lg font-semibold">{{ profile!.followers }}</div>
                <div class="text-xs text-gray-500">Followers</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold">{{ profile!.following }}</div>
                <div class="text-xs text-gray-500">Following</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold">{{ profile!.posts }}</div>
                <div class="text-xs text-gray-500">Posts</div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Portfolio table (demo) -->
      <UCard class="!bg-card !border-border">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-lg font-medium">Portfolio Snapshot</h3>
            <p class="text-sm text-gray-500">Simulated holdings (demo)</p>
          </div>
          <UButton color="gray" variant="outline" to="/portfolio">Open portfolio</UButton>
        </div>
        <UTable :rows="portfolioRows" :columns="portfolioColumns" />
      </UCard>
    </template>
  </div>
</template>

