import { defineEventHandler, getRequestHeaders, setHeader, sendNoContent } from 'h3'

export default defineEventHandler((event) => {
  const headers = getRequestHeaders(event)
  const origin = headers.origin || '*'

  setHeader(event, 'Access-Control-Allow-Origin', origin)
  setHeader(event, 'Vary', 'Origin')
  setHeader(event, 'Access-Control-Allow-Credentials', 'true')
  setHeader(event, 'Access-Control-Allow-Headers', headers['access-control-request-headers'] || 'Content-Type, Authorization')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')

  if (event.method === 'OPTIONS') {
    return sendNoContent(event, 204)
  }
})

