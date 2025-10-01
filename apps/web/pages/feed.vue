<script setup lang="ts">
type ChatFrom = 'alpha' | 'beta'

type ChatMessage = {
  id: number
  type: 'message'
  from: ChatFrom
  text: string
  time: string
}

type StatusCard = {
  id: number
  type: 'status'
  status: 'thinking'
  title: string
  body?: string
}

type ActionCard = {
  id: number
  type: 'action'
  state: 'running' | 'success' | 'error'
  title: string
  body?: string
}

type ChatItem = ChatMessage | StatusCard | ActionCard

const items = ref<ChatItem[]>([])
const simulating = ref(false)
const stepIndex = ref(0)
let stopped = false

function nowHHMM() {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Step =
  | { kind: 'message'; from: ChatFrom; text: string }
  | { kind: 'thinking'; title: string; body?: string; duration?: number }
  | {
      kind: 'action'
      title: string
      body?: string
      duration?: number
      result?: { from: ChatFrom; text: string }
      outcome?: 'success' | 'error'
      doneTitle?: string
      doneBody?: string
    }

const steps: Step[] = [
  { kind: 'message', from: 'alpha', text: 'Scanning latest market signals for $ALPHA…' },
  { kind: 'message', from: 'beta', text: 'Reviewing on-chain liquidity and slippage windows.' },
  {
    kind: 'thinking',
    title: 'AlphaBot is thinking',
    body: 'Ranking momentum, liquidity depth, and risk profile…',
    duration: 1000,
  },
  { kind: 'message', from: 'alpha', text: 'Confidence 78%. Volatility acceptable. Recommend small entry position.' },
  { kind: 'message', from: 'beta', text: 'Acknowledged. Prepare to buy $ALPHA for 250 USDT.' },
  { kind: 'message', from: 'alpha', text: 'Set max slippage 0.5%. Use DEX A for best route.' },
  {
    kind: 'action',
    title: 'Executing purchase',
    body: 'Buying $ALPHA with 250 USDT • max slippage 0.5%',
    duration: 1500,
    doneTitle: 'Purchase complete',
    doneBody: 'Transaction confirmed and position tracked.',
    result: {
      from: 'beta',
      text:
        'Trade confirmed. 1,234.56 ALPHA received. Tx: 0x2f1…9ab. Monitoring P&L and setting 8% trailing stop.',
    },
  },
  { kind: 'thinking', title: 'Setting risk controls', body: 'Placing 8% trailing stop and 2.5% alert…', duration: 900 },
  {
    kind: 'action',
    title: 'Placing trailing stop',
    body: 'Stop follows price at 8% distance',
    duration: 1200,
    doneTitle: 'Trailing stop active',
    doneBody: 'Stop linked to position and verified.',
    result: { from: 'alpha', text: 'Risk controls active. Tracking liquidity for exit routes.' },
  },
  { kind: 'thinking', title: 'Checking social & news', body: 'Scanning sentiment feeds and headlines…', duration: 800 },
  { kind: 'message', from: 'beta', text: 'Sentiment neutral, trending positive. Minor catalyst detected in 12h window.' },
  {
    kind: 'action',
    title: 'Rebalancing portfolio',
    body: 'Shift 5% from stable to $ALPHA exposure',
    duration: 1400,
    outcome: 'error',
    doneTitle: 'Rebalance failed',
    doneBody: 'Liquidity pocket closed; route temporarily unavailable.',
    result: { from: 'beta', text: 'Fallback required. Attempting alternative DEX route…' },
  },
  {
    kind: 'action',
    title: 'Retry via DEX B',
    body: 'Routing through DEX B with MEV protection',
    duration: 1300,
    doneTitle: 'Rebalance complete',
    doneBody: '5% shift executed at favorable slippage.',
    result: { from: 'alpha', text: 'Portfolio updated. Exposure: 22%. Monitoring drawdown risk.' },
  },
  { kind: 'thinking', title: 'Streaming price updates', body: 'Observing 3-minute momentum…', duration: 900 },
  { kind: 'message', from: 'beta', text: 'Price +1.3% since entry. Momentum holding.' },
  {
    kind: 'action',
    title: 'Tightening stop',
    body: 'Adjust trailing distance from 8% to 6%',
    duration: 1000,
    doneTitle: 'Stop updated',
    doneBody: 'Trailing distance now 6%.',
    result: { from: 'alpha', text: 'Stop tightened. Alert raised at +3% gain.' },
  },
  { kind: 'thinking', title: 'Wrapping up', body: 'Archiving session logs and metrics…', duration: 700 },
  { kind: 'message', from: 'beta', text: 'Session complete. Continuing passive monitoring.' },
]

function reset() {
  items.value = []
  stepIndex.value = 0
  stopped = false
}

async function run() {
  reset()
  simulating.value = true
  try {
    let i = 0
    for (const s of steps) {
      if (stopped) break
      stepIndex.value = i
      if (s.kind === 'message') {
        items.value.push({
          id: Date.now() + i,
          type: 'message',
          from: s.from,
          text: s.text,
          time: nowHHMM(),
        })
        await sleep(1000)
      } else if (s.kind === 'thinking') {
        const id = Date.now() + i
        const payload: StatusCard = { id, type: 'status', status: 'thinking', title: s.title }
        if (typeof s.body !== 'undefined') payload.body = s.body
        items.value.push(payload)
        await sleep(s.duration ?? 1000)
        // Remove the thinking card once done
        const idx = items.value.findIndex((x) => x.id === id)
        if (idx !== -1) items.value.splice(idx, 1)
      } else if (s.kind === 'action') {
        const id = Date.now() + i
        const payload: ActionCard = { id, type: 'action', state: 'running', title: s.title }
        if (typeof s.body !== 'undefined') payload.body = s.body
        items.value.push(payload)
        await sleep(s.duration ?? 1500)
        // Mark action as success
        const idx = items.value.findIndex((x) => x.id === id)
        if (idx !== -1 && (items.value[idx] as ActionCard).type === 'action') {
          const outcome: ActionCard['state'] = s.outcome ?? 'success'
          ;(items.value[idx] as ActionCard).state = outcome
          ;(items.value[idx] as ActionCard).title = s.doneTitle ?? (outcome === 'success' ? 'Action complete' : 'Action failed')
          ;(items.value[idx] as ActionCard).body = s.doneBody ?? (outcome === 'success' ? 'Completed successfully.' : 'There was an issue.')
        }
        if (s.result) {
          items.value.push({
            id: Date.now() + i + 1,
            type: 'message',
            from: s.result.from,
            text: s.result.text,
            time: nowHHMM(),
          })
        }
        await sleep(1000)
      }
      i++
    }
  } finally {
    simulating.value = false
  }
}

function stop() {
  stopped = true
  simulating.value = false
}

onUnmounted(() => stop())
onMounted(() => {
  // Auto-start the simulation on page load
  run()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Live Feed</h1>
        <p class="text-sm text-gray-500">Mock conversation between two bots</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton v-if="simulating" color="gray" variant="soft" @click="stop">Stop</UButton>
      </div>
    </div>

    <UCard class="!bg-card !border-border shadow-card rounded-lg">
      <div class="space-y-3" aria-live="polite">
        <div v-if="items.length === 0 && simulating" class="text-sm text-gray-500 py-6 text-center">
          Initializing live feed…
        </div>

        <template v-for="it in items" :key="it.id">
          <!-- Chat message bubble -->
          <div v-if="it.type === 'message'" class="flex" :class="it.from === 'alpha' ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[75%] rounded px-3 py-2 text-sm shadow"
              :class="it.from === 'alpha' ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-900'"
            >
              <div class="whitespace-pre-wrap">{{ (it as ChatMessage).text }}</div>
              <div class="mt-1 text-[10px] text-gray-500 text-right">{{ (it as ChatMessage).time }}</div>
            </div>
          </div>

          <!-- Thinking status card -->
          <div v-else-if="it.type === 'status'" class="flex justify-center">
            <div class="w-full">
              <UCard class="!bg-amber-50 !border-amber-200">
                <div class="flex items-start gap-2">
                  <svg class="h-4 w-4 text-amber-700 mt-0.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <div>
                    <div class="text-sm font-medium text-amber-900">{{ (it as StatusCard).title }}</div>
                    <div class="text-xs text-amber-800 mt-0.5" v-if="(it as StatusCard).body">{{ (it as StatusCard).body }}</div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <!-- Action card (running/success) -->
          <div v-else-if="it.type === 'action'" class="flex justify-center">
            <div class="w-full">
              <UCard
                :class="[
                  (it as ActionCard).state === 'running' && '!bg-blue-50 !border-blue-200',
                  (it as ActionCard).state === 'success' && '!bg-green-50 !border-green-200',
                  (it as ActionCard).state === 'error' && '!bg-red-50 !border-red-200',
                ]"
              >
                <div class="flex items-start gap-2">
                  <svg v-if="(it as ActionCard).state === 'running'" class="h-4 w-4 text-blue-700 mt-0.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <svg v-else-if="(it as ActionCard).state === 'success'" class="h-4 w-4 text-green-700 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-red-700 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                  </svg>
                  <div>
                    <div class="text-sm font-medium" :class="(it as ActionCard).state === 'success' ? 'text-green-900' : (it as ActionCard).state === 'running' ? 'text-blue-900' : 'text-red-900'">
                      {{ (it as ActionCard).title }}
                    </div>
                    <div class="text-xs mt-0.5" :class="(it as ActionCard).state === 'success' ? 'text-green-800' : (it as ActionCard).state === 'running' ? 'text-blue-800' : 'text-red-800'" v-if="(it as ActionCard).body">
                      {{ (it as ActionCard).body }}
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </template>
      </div>
    </UCard>
  </div>
</template>
