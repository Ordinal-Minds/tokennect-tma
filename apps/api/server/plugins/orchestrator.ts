import { orchestratorTick } from '../services/orchestrator'

let started = false
let running = false

function startLoop() {
  if (started) return
  started = true
  const intervalMs = Number(process.env.ORCHESTRATOR_INTERVAL_MS || 1000)
  setInterval(async () => {
    if (running) return
    running = true
    try {
      await orchestratorTick()
    } catch (e) {
      // swallow to avoid crashing loop
    } finally {
      running = false
    }
  }, intervalMs)
}

// Nitro plugin entry
export default () => {
  startLoop()
}
