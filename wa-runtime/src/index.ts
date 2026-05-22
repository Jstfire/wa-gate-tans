import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import QRCode from 'qrcode'
import pkg from 'whatsapp-web.js'
import type { ClientInfo, Message as WaMessage } from 'whatsapp-web.js'

const { Client, LocalAuth } = pkg

type WaStatus = 'disconnected' | 'initializing' | 'qr_pending' | 'authenticated' | 'connected' | 'error'

type RuntimeConfig = {
  port: number
  apiKey: string
  authDataPath: string
  cachePath: string
  corsOrigin: string
  autoStart: boolean
}

type RuntimeState = {
  status: WaStatus
  qrRaw: string | null
  lastError: string | null
  lastEventAt: string | null
  startedAt: string
  readyAt: string | null
  reconnectAttempts: number
}

type SendResult = {
  chatId: string
  messageId: string | null
  sentAt: string
  typingMs: number
  microDelayMs: number
}

const config = loadConfig()
const state: RuntimeState = {
  status: 'disconnected',
  qrRaw: null,
  lastError: null,
  lastEventAt: null,
  startedAt: new Date().toISOString(),
  readyAt: null,
  reconnectAttempts: 0,
}

let client: InstanceType<typeof Client> | null = null
let initializing: Promise<void> | null = null

const SendSchema = z.object({
  to: z.string().min(5),
  message: z.string().min(1).max(5000),
  simulateTyping: z.boolean().optional().default(true),
})

function loadConfig(): RuntimeConfig {
  const portRaw = process.env.PORT ?? '8787'
  const port = Number.parseInt(portRaw, 10)
  const apiKey = process.env.WA_RUNTIME_API_KEY ?? ''
  if (!apiKey) {
    console.warn('[WA-RUNTIME] WA_RUNTIME_API_KEY is empty. Set it before exposing this service.')
  }
  return {
    port: Number.isFinite(port) ? port : 8787,
    apiKey,
    authDataPath: process.env.WWEBJS_AUTH_PATH ?? '/data/wwebjs_auth',
    cachePath: process.env.WWEBJS_CACHE_PATH ?? '/data/wwebjs_cache',
    corsOrigin: process.env.WA_GATE_ORIGIN ?? 'https://wa-gate.buseldata.com',
    autoStart: (process.env.WA_RUNTIME_AUTO_START ?? 'true') === 'true',
  }
}

function touch(status: WaStatus): void {
  state.status = status
  state.lastEventAt = new Date().toISOString()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateTypingMs(messageLength: number): number {
  const charsPerSecond = 3.3 + Math.random() * 1.7
  const baseMs = (messageLength / charsPerSecond) * 1000
  const variedMs = baseMs * (0.8 + Math.random() * 0.4)
  return Math.round(Math.min(Math.max(variedMs, 3000), 45000))
}

function normalizePhoneNumber(input: string): string {
  let cleaned = input.replace(/\D/g, '')
  if (cleaned.startsWith('62')) cleaned = cleaned.slice(2)
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)
  if (cleaned.startsWith('8')) cleaned = `62${cleaned}`
  if (!cleaned.startsWith('62')) cleaned = `62${cleaned}`
  return cleaned
}

function toChatId(input: string): string {
  if (input.endsWith('@c.us') || input.endsWith('@g.us')) return input
  return `${normalizePhoneNumber(input)}@c.us`
}

function getInfo(): ClientInfo | null {
  return client?.info ?? null
}

function isAuthorized(authHeader: string | undefined): boolean {
  if (!config.apiKey) return false
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  return bearer === config.apiKey
}

async function forwardIncomingMessage(message: WaMessage): Promise<void> {
  if (message.fromMe || !message.body.trim()) return

  try {
    const contact = await message.getContact().catch(() => null)
    const response = await fetch(`${config.corsOrigin}/api/runtime/incoming`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        body: message.body,
        messageId: message.id.id,
        timestamp: message.timestamp,
        contactNumber: contact?.number ?? null,
        contactName: contact?.pushname ?? contact?.name ?? null,
      }),
    })
    if (!response.ok) {
      console.error('[WA-RUNTIME] Incoming webhook failed:', response.status, await response.text())
    }
  } catch (err: unknown) {
    console.error('[WA-RUNTIME] Incoming webhook error:', err instanceof Error ? err.message : String(err))
  }
}

async function ensureClient(): Promise<void> {
  if (client && state.status !== 'error') return
  if (initializing) return initializing

  initializing = startClient().finally(() => {
    initializing = null
  })
  return initializing
}

async function startClient(): Promise<void> {
  touch('initializing')
  state.lastError = null

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: config.authDataPath }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--js-flags=--max-old-space-size=128',
        '--single-process',
        '--no-zygote',
        `--disk-cache-dir=${config.cachePath}`,
      ],
    },
  })

  client.on('qr', (qr: string) => {
    if (state.status === 'authenticated' || state.status === 'connected') return
    state.qrRaw = qr
    touch('qr_pending')
    console.log('[WA-RUNTIME] QR received')
  })

  client.on('ready', () => {
    state.qrRaw = null
    state.readyAt = new Date().toISOString()
    state.reconnectAttempts = 0
    touch('connected')
    console.log('[WA-RUNTIME] Client ready')
  })

  client.on('authenticated', () => {
    state.qrRaw = null
    touch('authenticated')
    console.log('[WA-RUNTIME] Authenticated')
  })

  client.on('auth_failure', (message: string) => {
    state.lastError = message
    touch('error')
    console.error('[WA-RUNTIME] Auth failure:', message)
  })

  client.on('disconnected', (reason: string) => {
    state.lastError = reason
    touch('disconnected')
    client = null
    console.warn('[WA-RUNTIME] Disconnected:', reason)
    scheduleReconnect()
  })

  client.on('message', (message: WaMessage) => {
    console.log('[WA-RUNTIME] Incoming message', JSON.stringify({ from: message.from, type: message.type, hasBody: message.body.length > 0 }))
    void forwardIncomingMessage(message)
  })

  void client.initialize().catch((err: unknown) => {
    state.lastError = err instanceof Error ? err.message : 'WA client initialization failed'
    touch('error')
    console.error('[WA-RUNTIME] Initialize failed:', state.lastError)
    client = null
  })
}

function scheduleReconnect(): void {
  state.reconnectAttempts += 1
  const delayMs = Math.min(300_000, 5000 * 2 ** Math.min(state.reconnectAttempts, 6))
  setTimeout(() => {
    ensureClient().catch((err: unknown) => {
      state.lastError = err instanceof Error ? err.message : 'Reconnect failed'
      touch('error')
    })
  }, delayMs)
}

async function sendHumanLike(to: string, message: string, simulateTyping: boolean): Promise<SendResult> {
  if (!client || state.status !== 'connected') {
    throw new Error('WA client is not connected')
  }

  const chatId = toChatId(to)
  let typingMs = 0
  let microDelayMs = 0

  if (simulateTyping) {
    const chat = await client.getChatById(chatId)
    typingMs = calculateTypingMs(message.length)
    try {
      await chat.sendStateTyping()
      await sleep(typingMs)
    } finally {
      await chat.clearState()
    }
    microDelayMs = Math.floor(1000 + Math.random() * 2000)
    await sleep(microDelayMs)
  }

  const sent = await client.sendMessage(chatId, message)
  return {
    chatId,
    messageId: sent?.id?.id ?? null,
    sentAt: new Date().toISOString(),
    typingMs,
    microDelayMs,
  }
}

const app = new Hono()

app.use('*', cors({ origin: config.corsOrigin, allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'] }))

app.use('/api/*', async (c, next) => {
  if (!isAuthorized(c.req.header('Authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

app.get('/health', (c) => c.json({ ok: true, status: state.status, startedAt: state.startedAt }))

app.get('/api/status', (c) => {
  const info = getInfo()
  return c.json({
    status: state.status,
    hasQr: Boolean(state.qrRaw),
    lastError: state.lastError,
    lastEventAt: state.lastEventAt,
    readyAt: state.readyAt,
    reconnectAttempts: state.reconnectAttempts,
    account: info ? { wid: info.wid.user, pushname: info.pushname } : null,
  })
})

app.get('/api/qr', async (c) => {
  if (!state.qrRaw) {
    return c.json({ status: state.status, qr: null, raw: null })
  }

  try {
    const qr = await QRCode.toDataURL(state.qrRaw)
    return c.json({ status: state.status, qr, raw: state.qrRaw })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'QR generation failed'
    state.lastError = message
    return c.json({ status: state.status, qr: null, raw: state.qrRaw, error: message }, 500)
  }
})

app.post('/api/connect', async (c) => {
  await ensureClient()
  return c.json({ status: state.status, hasQr: Boolean(state.qrRaw) })
})

app.post('/api/disconnect', async (c) => {
  if (client) {
    await client.destroy()
    client = null
  }
  state.qrRaw = null
  touch('disconnected')
  return c.json({ status: state.status })
})

app.post('/api/send', async (c) => {
  const parsed = SendSchema.safeParse(await c.req.json())
  if (!parsed.success) {
    return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
  }
  try {
    const result = await sendHumanLike(parsed.data.to, parsed.data.message, parsed.data.simulateTyping)
    return c.json({ success: true, result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Send failed'
    return c.json({ success: false, error: message }, 500)
  }
})

serve({ fetch: app.fetch, port: config.port })
console.log(`[WA-RUNTIME] Listening on :${config.port}`)

if (config.autoStart) {
  ensureClient().catch((err: unknown) => {
    state.lastError = err instanceof Error ? err.message : 'Startup failed'
    touch('error')
    console.error('[WA-RUNTIME] Startup failed:', err)
  })
}
