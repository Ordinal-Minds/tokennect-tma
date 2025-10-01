import { eventHandler } from 'h3'

export default eventHandler(() => ({
  ok: true,
  service: 'api',
  timestamp: new Date().toISOString()
}))

