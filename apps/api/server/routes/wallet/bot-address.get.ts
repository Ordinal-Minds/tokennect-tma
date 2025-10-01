import { eventHandler } from 'h3'
import { getBotAddress } from '../../services/ton'

export default eventHandler(async () => {
  const address = await getBotAddress()
  return { ok: true, address }
})

