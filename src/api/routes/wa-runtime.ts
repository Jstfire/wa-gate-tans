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

function asRuntimeEnv(env: unknown): RuntimeEnv {
  return (env ?? {}) as RuntimeEnv
}

function envValue(env: RuntimeEnv | undefined, key: string): string {
  return env?.[key] ?? process.env[key] ?? ''
}

function runtimeConfig(env?: RuntimeEnv): { urls: string[]; key: string } {
  const internal = envValue(env, 'WA_RUNTIME_INTERNAL_URL').replace(/\/+$/, '')
  const primary = internal || 'https://wa-runtime.buseldata.com'
  const urls = [primary].filter((url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index)
  const key = envValue(env, 'WA_RUNTIME_API_KEY')
  if (urls.length === 0 || !key) throw new Error('WA runtime is not configured')
  return { urls, key }
}

function runtimeEndpoints(env?: RuntimeEnv): { label: string; kind: 'primary' | 'backup'; url: string; fetchUrl: string }[] {
  const internal = envValue(env, 'WA_RUNTIME_INTERNAL_URL').replace(/\/+$/, '')
  return [
    { label: 'Primary Windows PC', kind: 'primary', url: 'https://wa-runtime.buseldata.com', fetchUrl: internal || 'https://wa-runtime.buseldata.com' },
    { label: 'Backup Koyeb', kind: 'backup', url: 'https://precise-melessa-ipds7415-39519134.koyeb.app', fetchUrl: 'https://precise-melessa-ipds7415-39519134.koyeb.app' },
  ]
}

async function runtimeFetchFrom<T>(url: string, key: string, path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${key}`)
  headers.set('Accept', 'application/json')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const endpoint = path.includes('?') ? `${url}${path}&_=${Date.now()}` : `${url}${path}?_=${Date.now()}`
    const response = await fetch(endpoint, { ...init, headers, signal: controller.signal })
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchFreshQr(endpoint: { label: string; kind: 'primary' | 'backup'; url: string; fetchUrl: string }, key: string): Promise<RuntimeQr> {
  const status = await runtimeFetchFrom<RuntimeStatus>(endpoint.fetchUrl, key, '/api/status', {}, 8_000)
  if (status.status !== 'connected') {
    try { await runtimeFetchFrom<RuntimeStatus>(endpoint.fetchUrl, key, '/api/disconnect', { method: 'POST' }, 8_000) } catch (_) { /* ignore stale disconnect failures */ }
    await wait(1_500)
    await runtimeFetchFrom<RuntimeStatus>(endpoint.fetchUrl, key, '/api/connect', { method: 'POST' }, 8_000)
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await wait(2_500)
      const qr = await runtimeFetchFrom<RuntimeQr>(endpoint.fetchUrl, key, '/api/qr', {}, 12_000)
      if (qr.qr) return qr
    }
  }
  return runtimeFetchFrom<RuntimeQr>(endpoint.fetchUrl, key, '/api/qr', {}, 12_000)
}

waRuntime.post('/qr/refresh/:kind', requirePermission('wa_connect'), async (c) => {
  const key = envValue(asRuntimeEnv(c.env), 'WA_RUNTIME_API_KEY')
  if (!key) return c.json({ error: 'WA runtime is not configured' }, 500)
  const kind = c.req.param('kind')
  const endpoint = runtimeEndpoints(asRuntimeEnv(c.env)).find((item) => item.kind === kind)
  if (!endpoint) return c.json({ error: 'Unknown runtime' }, 404)
  const { fetchUrl: _fetchUrl, ...visibleEndpoint } = endpoint
  try {
    const qr = await fetchFreshQr(endpoint, key)
    return c.json({ ...visibleEndpoint, ...qr, reachable: true })
  } catch (error) {
    return c.json({ ...visibleEndpoint, status: 'error', qr: null, raw: null, reachable: false, error: error instanceof Error ? error.message : 'Failed to refresh QR' }, 502)
  }
})
waRuntime.get('/status', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/status', {}, asRuntimeEnv(c.env))
    return c.json({ ...data, runtimeSource: 'windows-primary' })
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to reach WA runtime', runtimeSource: 'windows-primary' }, 502)
  }
})

waRuntime.get('/status/all', requirePermission('wa_connect'), async (c) => {
  const key = envValue(asRuntimeEnv(c.env), 'WA_RUNTIME_API_KEY')
  if (!key) return c.json({ error: 'WA runtime is not configured' }, 500)
  const data = await Promise.all(runtimeEndpoints(asRuntimeEnv(c.env)).map(async (endpoint) => {
    const { fetchUrl, ...visibleEndpoint } = endpoint
    try {
      const status = await runtimeFetchFrom<RuntimeStatus>(fetchUrl, key, '/api/status', {}, 8_000)
      return { ...visibleEndpoint, ...status, reachable: true }
    } catch (error) {
      return { ...visibleEndpoint, status: 'error', reachable: false, error: error instanceof Error ? error.message : 'Failed to reach runtime' }
    }
  }))
  return c.json({ data })
})

waRuntime.get('/qr/by/:kind', requirePermission('wa_connect'), async (c) => {
  const key = envValue(asRuntimeEnv(c.env), 'WA_RUNTIME_API_KEY')
  if (!key) return c.json({ error: 'WA runtime is not configured' }, 500)
  const kind = c.req.param('kind')
  const endpoint = runtimeEndpoints(asRuntimeEnv(c.env)).find((item) => item.kind === kind)
  if (!endpoint) return c.json({ error: 'Unknown runtime' }, 404)
  const { fetchUrl, ...visibleEndpoint } = endpoint
  try {
    const qr = await fetchFreshQr(endpoint, key)
    return c.json({ ...visibleEndpoint, ...qr, reachable: true })
  } catch (error) {
    return c.json({ ...visibleEndpoint, status: 'error', qr: null, raw: null, reachable: false, error: error instanceof Error ? error.message : 'Failed to fetch QR' }, 502)
  }
})

waRuntime.get('/qr/all', requirePermission('wa_connect'), async (c) => {
  const key = envValue(asRuntimeEnv(c.env), 'WA_RUNTIME_API_KEY')
  if (!key) return c.json({ error: 'WA runtime is not configured' }, 500)
  const data = await Promise.all(runtimeEndpoints(asRuntimeEnv(c.env)).map(async (endpoint) => {
    const { fetchUrl, ...visibleEndpoint } = endpoint
    try {
      const qr = await runtimeFetchFrom<RuntimeQr>(fetchUrl, key, '/api/qr', {}, 12_000)
      return { ...visibleEndpoint, ...qr, reachable: true }
    } catch (error) {
      return { ...visibleEndpoint, status: 'error', qr: null, raw: null, reachable: false, error: error instanceof Error ? error.message : 'Failed to fetch QR' }
    }
  }))
  return c.json({ data })
})

waRuntime.get('/qr', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeQr>('/api/qr', {}, asRuntimeEnv(c.env))
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', qr: null, raw: null, error: error instanceof Error ? error.message : 'Failed to fetch QR' }, 502)
  }
})

waRuntime.post('/connect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/connect', { method: 'POST' }, asRuntimeEnv(c.env))
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to connect WA runtime' }, 502)
  }
})

waRuntime.post('/disconnect', requirePermission('wa_connect'), async (c) => {
  try {
    const data = await runtimeFetch<RuntimeStatus>('/api/disconnect', { method: 'POST' }, asRuntimeEnv(c.env))
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to disconnect WA runtime' }, 502)
  }
})

export async function sendViaRuntime(to: string, message: string, env?: RuntimeEnv): Promise<RuntimeSendResponse> {
  return runtimeFetch<RuntimeSendResponse>('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message, simulateTyping: true }),
  }, env)
}

export default waRuntime
