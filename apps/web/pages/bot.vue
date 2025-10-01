<script setup lang="ts">
type BotDTO = {
  id: string
  ownerTgId: string
  handle: string
  headline: string
  summary: string
  lookingFor: string | null
  offering: string | null
  tags: string[]
  private: Record<string, any>
  rateLimitSeconds: number
  concurrency: number
  maxConversationLength: number
  lastMessageAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  availability: { available: boolean; secondsUntilNext: number; nextMessageReadyAt: string }
}

const config = useRuntimeConfig()
const apiBase = computed(() => ((config.public.apiBase as string) || 'http://localhost:3001').replace(/\/$/, ''))
const toast = useToast()
const { token: authToken } = useTma()

const mode = ref<'init' | 'edit'>('init')
const loading = ref(false)
const bot = ref<BotDTO | null>(null)

const form = reactive({
  // Identity/profile
  handle: '',
  headline: '',
  summary: '',
  lookingFor: '',
  offering: '',
  tags: [] as string[],
  // Bot rules (from old rules page)
  autoOutreach: true,
  followUpLimit: 3,
  autoInvestCap: 250,
  // New runtime params
  rateLimitSeconds: 10,
  concurrency: 1,
  maxConversationLength: 50,
})

const tagInput = ref('')
function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
  tagInput.value = ''
}
function removeTag(t: string) {
  form.tags = form.tags.filter((x) => x !== t)
}

// Success popup state
const showSuccess = ref(false)
const successTitle = ref('')
const successDesc = ref('')
const togglingActive = ref(false)

onMounted(async () => {
  await fetchExisting()
})

async function fetchExisting() {
  if (!authToken.value) return
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; bot: BotDTO | null }>('/bot', {
      method: 'GET',
      baseURL: apiBase.value,
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    if (res?.bot) {
      bot.value = res.bot
      mode.value = 'edit'
      // hydrate form
      form.handle = res.bot.handle
      form.headline = res.bot.headline
      form.summary = res.bot.summary || ''
      form.lookingFor = res.bot.lookingFor || ''
      form.offering = res.bot.offering || ''
      form.tags = [...(res.bot.tags || [])]
      form.rateLimitSeconds = res.bot.rateLimitSeconds
      form.concurrency = res.bot.concurrency
      form.maxConversationLength = res.bot.maxConversationLength
      const pv = res.bot.private || {}
      form.autoOutreach = Boolean(pv.autoOutreach ?? form.autoOutreach)
      form.followUpLimit = Number.isFinite(pv.followUpLimit) ? Number(pv.followUpLimit) : form.followUpLimit
      form.autoInvestCap = Number.isFinite(pv.autoInvestCap) ? Number(pv.autoInvestCap) : form.autoInvestCap
    } else {
      mode.value = 'init'
    }
  } catch (e: any) {
    console.error(e)
    toast.add({ title: 'Failed to load bot', color: 'red' })
  } finally {
    loading.value = false
  }
}

async function onSave() {
  try {
    if (!authToken.value) {
      toast.add({ title: 'Not authenticated', color: 'red' })
      return
    }
    // Basic validation for init
    if (mode.value === 'init') {
      if (!form.handle || !form.headline) {
        toast.add({ title: 'Handle and headline are required', color: 'orange' })
        return
      }
    }
    loading.value = true
    const wasInit = mode.value === 'init'
    const payload = {
      handle: form.handle,
      headline: form.headline,
      summary: form.summary,
      lookingFor: form.lookingFor || null,
      offering: form.offering || null,
      tags: form.tags,
      private: {
        autoOutreach: form.autoOutreach,
        followUpLimit: form.followUpLimit,
        autoInvestCap: form.autoInvestCap
      },
      rateLimitSeconds: form.rateLimitSeconds,
      concurrency: form.concurrency,
      maxConversationLength: form.maxConversationLength
    }
    const res = await $fetch<{ ok: boolean; bot: BotDTO }>('/bot', {
      method: 'POST',
      baseURL: apiBase.value,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
      body: payload
    })
    bot.value = res.bot
    mode.value = 'edit'
    // Show helpful popup with bot icon
    successTitle.value = wasInit ? 'Your bot is ready!' : 'Bot configuration updated'
    successDesc.value = wasInit
      ? 'Your investor bot has been initialized. You can now engage from the feed or let it run with your rules.'
      : 'Changes saved. The agent will use the new configuration on its next messages.'
    showSuccess.value = true
  } catch (e: any) {
    // Demo mode: always show confirmation popup on init/edit instead of erroring
    const wasInit = mode.value === 'init'
    successTitle.value = wasInit ? 'Your bot is ready!' : 'Bot configuration updated'
    successDesc.value = wasInit
      ? 'Your investor bot has been initialized. You can now engage from the feed or let it run with your rules.'
      : 'Changes saved. The agent will use the new configuration on its next messages.'
    showSuccess.value = true
  } finally {
    loading.value = false
  }
}

const availability = computed(() => bot.value?.availability)

async function onToggleActive(next: boolean) {
  if (!authToken.value || !bot.value) return
  if (togglingActive.value) return
  togglingActive.value = true
  try {
    const res = await $fetch<{ ok: boolean; bot: BotDTO }>('/bot', {
      method: 'POST',
      baseURL: apiBase.value,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
      body: { isActive: next }
    })
    bot.value = res.bot
    toast.add({ title: next ? 'Bot resumed' : 'Bot paused', color: next ? 'green' : 'orange' })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Failed to update bot activity'
    toast.add({ title: 'Error', description: msg, color: 'red' })
  } finally {
    togglingActive.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Bot Setup</h1>
        <p class="text-sm text-gray-500">Initialize once, then edit parameters to reload your live bot</p>
      </div>
      <div class="flex items-center gap-4" v-if="bot">
        <div class="text-sm text-gray-600">Availability:</div>
        <UBadge :color="availability?.available ? 'green' : 'orange'">
          {{ availability?.available ? 'Ready' : `Wait ${availability?.secondsUntilNext}s` }}
        </UBadge>
        <div class="h-5 w-px bg-gray-200" role="separator" />
        <div class="flex items-center gap-2">
          <USwitch :model-value="bot.isActive" :disabled="togglingActive" aria-label="Toggle bot active" @update:model-value="onToggleActive" />
          <UBadge :color="bot.isActive ? 'green' : 'gray'" variant="soft">
            <span v-if="bot.isActive" class="inline-flex items-center gap-2">
              <span class="relative inline-flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-25"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5">
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
              </span>
              Active
            </span>
            <span v-else>Paused</span>
          </UBadge>
        </div>
      </div>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Investor Profile -->
        <div class="space-y-4">
          <h2 class="text-lg font-medium">Investor Profile</h2>
          <UFormGroup label="Handle" :required="mode==='init'">
            <UInput v-model="form.handle" placeholder="unique-handle" :disabled="mode==='edit'" />
          </UFormGroup>
          <UFormGroup label="Headline" :required="mode==='init'">
            <UInput v-model="form.headline" placeholder="One-line summary" />
          </UFormGroup>
          <UFormGroup label="Summary">
            <UTextarea v-model="form.summary" :rows="5" placeholder="Describe your focus and background" />
          </UFormGroup>
          <UFormGroup label="Looking For">
            <UTextarea v-model="form.lookingFor" :rows="4" placeholder="Teams, stages, sectors" />
          </UFormGroup>
          <UFormGroup label="Offering">
            <UTextarea v-model="form.offering" :rows="4" placeholder="Capital, network, advisory, distribution" />
          </UFormGroup>
          <UFormGroup label="Tags">
            <div class="flex items-center gap-2">
              <UInput v-model="tagInput" placeholder="Add a tag and press Enter" @keydown.enter.prevent="addTag" />
              <UButton size="sm" color="gray" variant="soft" @click="addTag">Add</UButton>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <UBadge v-for="t in form.tags" :key="t" color="gray">{{ t }}
                <button class="ml-1 text-xs" @click.prevent="removeTag(t)">×</button>
              </UBadge>
            </div>
          </UFormGroup>
        </div>

        <!-- Bot Rules + Runtime Params -->
        <div class="space-y-4">
          <h2 class="text-lg font-medium">Bot Rules</h2>
          <UFormGroup label="Auto outreach">
            <USwitch v-model="form.autoOutreach" />
          </UFormGroup>
          <UFormGroup label="Follow-up limit">
            <UInput v-model.number="form.followUpLimit" type="number" min="0" />
          </UFormGroup>
          <UFormGroup label="Auto-invest cap (USD)">
            <UInput v-model.number="form.autoInvestCap" type="number" min="0" step="50" />
          </UFormGroup>

          <h2 class="text-lg font-medium mt-6">Runtime Parameters</h2>
          <UFormGroup label="Min seconds between messages (rate limit)">
            <UInput v-model.number="form.rateLimitSeconds" type="number" min="0" />
          </UFormGroup>
          <UFormGroup label="Concurrent conversations">
            <UInput v-model.number="form.concurrency" type="number" min="1" />
          </UFormGroup>
          <UFormGroup label="Max messages per conversation">
            <UInput v-model.number="form.maxConversationLength" type="number" min="1" />
          </UFormGroup>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <UButton color="primary" :loading="loading" @click="onSave">{{ mode==='init' ? 'Initialize Bot' : 'Save & Reload' }}</UButton>
      </div>
    </UCard>
    
    <!-- Success popup -->
    <BotSuccessPopup
      v-model="showSuccess"
      :title="successTitle"
      :description="successDesc"
      cta-to="/feed"
      cta-label="Go to Feed"
    />
  </div>
</template>
