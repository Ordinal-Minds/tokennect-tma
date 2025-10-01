import { txOrchestratorTick } from '../services/tx-orchestrator'

let started = false
let running = false

function startLoop() {
  if (started) return
  started = true
  const enabled = String(process.env.TX_ORCHESTRATOR_ENABLED || 'true') === 'true'
  if (!enabled) return
  const intervalMs = Number(process.env.TX_ORCHESTRATOR_INTERVAL_MS || 1500)
  setInterval(async () => {
    if (running) return
    running = true
    try {
      await txOrchestratorTick()
    } catch (_e) {
      // ignore errors to keep the loop running
    } finally {
      running = false
    }
  }, intervalMs)
}

export default () => {
  startLoop()
}

