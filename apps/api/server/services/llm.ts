import { getRuntimeConfig } from '../utils/runtime'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type LlmOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function chatComplete(messages: ChatMessage[], opts?: LlmOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI_KEY
  if (!apiKey) {
    // Deterministic fallback for development without keys
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const base = lastUser?.content || 'Continuing the discussion.'
    return `Echo: ${base.slice(0, 220)}`
  }

  const model = opts?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const body = {
    model,
    messages,
    temperature: typeof opts?.temperature === 'number' ? opts!.temperature : 0.7,
    max_tokens: typeof opts?.maxTokens === 'number' ? opts!.maxTokens : 200,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // Best-effort fallback
    const txt = await res.text().catch(() => '')
    return `Echo: ${messages[messages.length - 1]?.content || ''}`.slice(0, 220)
  }
  const data = (await res.json()) as any
  const txt = data?.choices?.[0]?.message?.content || ''
  return String(txt)
}

export async function summarizeText(text: string, opts?: { maxTokens?: number }): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI_KEY
  if (!apiKey) {
    // Simple heuristic fallback
    const trimmed = text.replace(/\s+/g, ' ').trim()
    return trimmed.slice(0, 480)
  }
  const prompt: ChatMessage[] = [
    { role: 'system', content: 'You write concise conversation summaries in 1-2 sentences.' },
    { role: 'user', content: `Summarize the following conversation briefly and neutrally.\n\n${text}` },
  ]
  return chatComplete(prompt, { maxTokens: opts?.maxTokens ?? 120, temperature: 0.3 })
}

