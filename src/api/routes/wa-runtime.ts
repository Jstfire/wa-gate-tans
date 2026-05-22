import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

type RuntimeStatus = {
  status: string
  hasQr?: boolean
  lastError?: string | null
  lastEventAt?: string | null
  readyAt?: string | null
  reconnectAttempts?: number
  account?: { wid: string; pushname?: string } | null
}

type RuntimeQr = {
  status: string
  qr: string | null
  raw: string | null
}

type RuntimeSendResponse = {
  success: boolean
  result?: {
    chatId: string
    messageId: string | null
    sentAt: string
    typingMs: number
    microDelayMs: number
  }
  error?: string
}

const waRuntime = new Hono()

waRuntime.use('*', authMiddleware)

function runtimeConfig(): { url: string; key: string } {
  const url = process.env.WA_RUNTIME_URL?.replace(/\/+$/, '') ?? ''
  const key = process.env.WA_RUNTIME_API_KEY ?? ''
  if (!url || !key) {
    throw new Error('WA runtime is not configured')
  }
  return { url, key }
}

async function runtimeFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = runtimeConfig()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${key}`)
  headers.set('Accept', 'application/json')

  const controller = new AbortController()
  const timeoutMs = path === '/api/send' ? 45_000 : path === '/api/qr' ? 12_000 : 8_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${url}${path}`, { ...init, headers, signal: controller.signal })
    const text = await response.text()
    const data = text ? (JSON.parse(text) as T) : ({} as T)
    if (!response.ok) {
      const message = typeof data === 'object' && data && 'error' in data ? String((data as { error?: unknown }).error) : 'WA runtime request failed'
      throw new Error(message)
    }
    return data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`WA runtime timeout after ${timeoutMs / 1000}s`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

waRuntime.get('/status', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/status')
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to reach WA runtime' }, 502)
  }
})

waRuntime.get('/qr', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeQr>('/api/qr')
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', qr: null, raw: null, error: error instanceof Error ? error.message : 'Failed to fetch QR' }, 502)
  }
})

waRuntime.post('/connect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/connect', { method: 'POST' })
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to connect WA runtime' }, 502)
  }
})

waRuntime.post('/disconnect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/disconnect', { method: 'POST' })
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to disconnect WA runtime' }, 502)
  }
})

export async function sendViaRuntime(to: string, message: string): Promise<RuntimeSendResponse> {
  return runtimeFetch<RuntimeSendResponse>('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message, simulateTyping: true }),
  })
}

export default waRuntime
