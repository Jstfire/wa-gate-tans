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

type RuntimeEnv = Record<string, string | undefined>

function envValue(env: RuntimeEnv | undefined, key: string): string {
  return env?.[key] ?? process.env[key] ?? ''
}

function runtimeConfig(env?: RuntimeEnv): { urls: string[]; key: string } {
  const primary = envValue(env, 'WA_RUNTIME_PRIMARY_URL').replace(/\/+$/, '') || 'https://wa-runtime.buseldata.com'
  const backup = envValue(env, 'WA_RUNTIME_BACKUP_URL').replace(/\/+$/, '') || envValue(env, 'WA_RUNTIME_URL').replace(/\/+$/, '') || ''
  const urls = [primary, backup].filter((url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index)
  const key = envValue(env, 'WA_RUNTIME_API_KEY')
  if (urls.length === 0 || !key) throw new Error('WA runtime is not configured')
  return { urls, key }
}

async function runtimeFetchFrom<T>(url: string, key: string, path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${key}`)
  headers.set('Accept', 'application/json')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${url}${path}`, { ...init, headers, signal: controller.signal })
    const text = await response.text()
    const data = text ? (JSON.parse(text) as T) : ({} as T)
    if (!response.ok) {
      const message = typeof data === 'object' && data && 'error' in data ? String((data as { error?: unknown }).error) : 'WA runtime request failed'
      throw new Error(`${url}: ${message}`)
    }
    return data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error(`${url}: WA runtime timeout after ${timeoutMs / 1000}s`)
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function runtimeFetch<T>(path: string, init: RequestInit = {}, env?: RuntimeEnv): Promise<T> {
  const { urls, key } = runtimeConfig(env)
  const timeoutMs = path === '/api/send' ? 45_000 : path === '/api/qr' ? 12_000 : 8_000
  let lastError: unknown = null
  for (const url of urls) {
    try { return await runtimeFetchFrom<T>(url, key, path, init, timeoutMs) }
    catch (error) { lastError = error }
  }
  throw lastError instanceof Error ? lastError : new Error('WA runtime request failed')
}

waRuntime.get('/status', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/status', {}, c.env)
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to reach WA runtime' }, 502)
  }
})

waRuntime.get('/qr', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeQr>('/api/qr', {}, c.env)
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', qr: null, raw: null, error: error instanceof Error ? error.message : 'Failed to fetch QR' }, 502)
  }
})

waRuntime.post('/connect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/connect', { method: 'POST' }, c.env)
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to connect WA runtime' }, 502)
  }
})

waRuntime.post('/disconnect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/disconnect', { method: 'POST' }, c.env)
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
