import { serve } from '@hono/node-server'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
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

const execFileAsync = promisify(execFile)
const SESSION_ARCHIVE = '/tmp/wagate-session.tar.gz'
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
let watchdogTimer: ReturnType<typeof setInterval> | null = null
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
    authDataPath: process.env.WWEBJS_AUTH_PATH ?? '.wwebjs_auth',
    cachePath: process.env.WWEBJS_CACHE_PATH ?? '.wwebjs_cache',
    corsOrigin: 'https://wa-gate.buseldata.com',
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs / 1000}s`)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
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
  if (input.endsWith('@c.us') || input.endsWith('@g.us') || input.endsWith('@lid')) return input
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

// LID-to-Phone resolution cache — persists across messages in same runtime session
const lidToPhoneCache = new Map<string, string>()

async function resolveLidToPhone(lid: string): Promise<string | null> {
  if (lidToPhoneCache.has(lid)) return lidToPhoneCache.get(lid) ?? null
  if (!client || (state.status !== 'connected' && state.status !== 'authenticated')) return null

  try {
    // PRIMARY: getContactLidAndPhone
    const results = await withTimeout(
      client.getContactLidAndPhone([lid]),
      10_000,
      'getContactLidAndPhone'
    ).catch(() => [])

    if (Array.isArray(results)) {
      for (const entry of results) {
        if (entry?.pn && /^\d{10,15}$/.test(entry.pn)) {
          let phone = entry.pn
          if (phone.startsWith('0')) phone = '62' + phone.slice(1)
          if (phone.startsWith('8') && phone.length >= 9) phone = '62' + phone
          if (!phone.startsWith('62')) phone = '62' + phone
          if (/^62\d{7,15}$/.test(phone)) {
            lidToPhoneCache.set(lid, phone)
            console.log('[WA-RUNTIME] LID resolved via getContactLidAndPhone:', lid, '->', phone)
            return phone
          }
        }
      }
    }

    // FALLBACK: getContactById
    const lidContact = await withTimeout(
      client.getContactById(lid + '@lid'),
      8_000,
      'getContactById'
    ).catch(() => null)
    if (lidContact?.number && /^\d{10,15}$/.test(lidContact.number)) {
      let phone = lidContact.number
      if (phone.startsWith('0')) phone = '62' + phone.slice(1)
      if (phone.startsWith('8') && phone.length >= 9) phone = '62' + phone
      if (!phone.startsWith('62')) phone = '62' + phone
      if (/^62\d{7,15}$/.test(phone)) {
        lidToPhoneCache.set(lid, phone)
        console.log('[WA-RUNTIME] LID resolved via getContactById:', lid, '->', phone)
        return phone
      }
    }

    console.warn('[WA-RUNTIME] LID NOT resolved:', lid)
  } catch (err) {
    console.warn('[WA-RUNTIME] LID resolution error:', err instanceof Error ? err.message : String(err))
  }
  return null
}

async function forwardIncomingMessage(message: WaMessage): Promise<void> {
  if (message.fromMe || !message.body.trim() || message.from === 'status@broadcast') return

  try {
    const contact = await message.getContact().catch(() => null)
    const chat = await message.getChat().catch(() => null)
    const fromUser = message.from.split('@')[0] ?? ''
    const fromIsLid = message.from.includes('@lid')

    // === LID-TO-PHONE RESOLUTION ===
    let phone: string | null = null

    // Step 1: Direct sources (most reliable)
    phone = contact?.number || null
    if (!phone && contact?.id?.server === 'c.us' && /^\d{10,15}$/.test(contact.id.user ?? '')) phone = contact.id.user
    if (!phone && chat?.id?.server === 'c.us' && /^\d{10,15}$/.test(chat.id.user ?? '')) phone = chat.id.user

    // Step 2: If message.from is already a phone
    if (!phone && !fromIsLid && /^62\d{7,15}$/.test(fromUser)) phone = fromUser

    // Step 3: LID-to-Phone resolution via cache + contact search
    if (!phone && fromIsLid) {
      phone = await resolveLidToPhone(fromUser)
    }

    // Step 4: Try extracting phone from LID user part (some LIDs contain phone)
    if (!phone && fromIsLid) {
      const candidate = contact?.id?.user || chat?.id?.user || fromUser
      if (candidate) {
        let normalized = candidate.replace(/\D/g, '')
        if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1)
        if (normalized.startsWith('8') && normalized.length >= 9) normalized = '62' + normalized
        if (/^62\d{7,15}$/.test(normalized)) phone = normalized
      }
    }

    // Step 5: Final normalization
    if (phone) {
      let p = phone.replace(/\D/g, '')
      if (p.startsWith('0')) p = '62' + p.slice(1)
      if (p.startsWith('8') && p.length >= 9) p = '62' + p
      if (!p.startsWith('62')) p = '62' + p
      if (/^62\d{7,15}$/.test(p)) phone = p
      else phone = null
    }

    // Step 6: NEVER SKIP — use raw ID as last resort
    if (!phone) {
      console.warn('[WA-RUNTIME] Could not resolve phone for:', message.from, '| forwarding with raw ID')
      phone = fromUser.replace(/\D/g, '')
      if (!phone) {
        console.error('[WA-RUNTIME] Completely unresolvable sender:', message.from)
        return
      }
    }

    // Log resolution result
    const resolved = /^62\d{7,15}$/.test(phone)
    console.log(`[WA-RUNTIME] Forwarding: ${message.from} → ${phone}${resolved ? ' (resolved)' : ' (raw LID)'}`)

    // Store LID-to-phone mapping if resolved
    if (resolved && fromIsLid) {
      lidToPhoneCache.set(fromUser, phone)
      // Also tell the webhook about this mapping
      void fetch(`${config.corsOrigin}/api/runtime/lid-map`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lid: fromUser, phone }),
      }).catch(() => {})
    }

    // === SEND TO WEBHOOK — ALWAYS with resolved phone ===
    const ownNumber = message.to.split('@')[0] ?? ''
    const response = await fetch(`${config.corsOrigin}/api/runtime/incoming`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: phone + '@c.us',
        to: (/^62\d{7,15}$/.test(ownNumber) ? ownNumber : phone) + '@c.us',
        body: message.body,
        messageId: message.id.id,
        timestamp: message.timestamp,
        contactNumber: phone,
        contactName: contact?.pushname ?? contact?.name ?? null,
        contactId: phone + '@c.us',
        chatId: phone + '@c.us',
      }),
    })
    if (!response.ok) {
      console.error('[WA-RUNTIME] Incoming webhook failed:', response.status, await response.text())
    }
  } catch (err: unknown) {
    console.error('[WA-RUNTIME] Incoming webhook error:', err instanceof Error ? err.message : String(err))
  }
}

async function restoreSessionFromGate(): Promise<void> {
  if (existsSync(config.authDataPath)) return
  try {
    const response = await fetch(`${config.corsOrigin}/api/runtime/session`, { headers: { Authorization: `Bearer ${config.apiKey}` } })
    if (!response.ok) return
    const data = await response.json() as { archiveBase64?: string | null }
    if (!data.archiveBase64) return
    await mkdir(config.authDataPath, { recursive: true })
    await mkdir(config.cachePath, { recursive: true })
    await writeFile(SESSION_ARCHIVE, Buffer.from(data.archiveBase64, 'base64'))
    await execFileAsync('tar', ['-xzf', SESSION_ARCHIVE, '-C', '/'])
    console.log('[WA-RUNTIME] Session restored from WA Gate DB')
  } catch (err: unknown) {
    console.warn('[WA-RUNTIME] Session restore skipped:', err instanceof Error ? err.message : String(err))
  }
}

async function backupSessionToGate(): Promise<void> {
  if (!existsSync(config.authDataPath)) return
  try {
    await rm(SESSION_ARCHIVE, { force: true })
    await execFileAsync('tar', ['-czf', SESSION_ARCHIVE, config.authDataPath.replace(/^\//, ''), config.cachePath.replace(/^\//, '')], { cwd: '/' })
    const archiveBase64 = (await readFile(SESSION_ARCHIVE)).toString('base64')
    const account = getInfo()
    const response = await fetch(`${config.corsOrigin}/api/runtime/session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ archiveBase64, phoneNumber: account?.wid?.user ?? null, name: account?.pushname ?? null }),
    })
    if (!response.ok) console.warn('[WA-RUNTIME] Session backup failed:', response.status, await response.text())
    else console.log('[WA-RUNTIME] Session backed up to WA Gate DB')
  } catch (err: unknown) {
    console.warn('[WA-RUNTIME] Session backup skipped:', err instanceof Error ? err.message : String(err))
  }
}

async function ensureClient(): Promise<void> {
  if (client && state.status !== 'error') return
  if (initializing) return initializing

  initializing = (async () => { await restoreSessionFromGate(); await startClient() })().finally(() => {
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
        // Do not use --single-process here. On Windows/Chrome it can detach the
        // WhatsApp Web main frame during startup, causing the runtime to miss
        // inbound messages or fail before the bot webhook can reply.
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
    setTimeout(() => { void backupSessionToGate() }, 5000)
  })

  client.on('authenticated', () => {
    state.qrRaw = null
    touch('authenticated')
    console.log('[WA-RUNTIME] Authenticated')
    setTimeout(() => { void backupSessionToGate() }, 10000)
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


// ============================================================
// SELF-HEALING WATCHDOG — checks every 60s
// ============================================================
function startWatchdog(): void {
  if (watchdogTimer) clearInterval(watchdogTimer)
  watchdogTimer = setInterval(async () => {
    const now = Date.now()
    const lastEvent = state.lastEventAt ? new Date(state.lastEventAt).getTime() : 0
    const staleMinutes = (now - lastEvent) / 60_000

    if (state.status === 'connected' && staleMinutes > 10) {
      console.warn('[WA-RUNTIME] Watchdog: no events for ' + Math.round(staleMinutes) + 'min, checking health...')
      try {
        const waState = await withTimeout(client!.getState(), 10_000, 'getState')
        if (waState !== 'CONNECTED') {
          console.warn('[WA-RUNTIME] Watchdog: state is', waState, '— reconnecting')
          touch('error')
          await destroyClient()
          await ensureClient()
        }
      } catch {
        console.warn('[WA-RUNTIME] Watchdog: getState failed — reconnecting')
        touch('error')
        await destroyClient()
        await ensureClient()
      }
    }

    if (state.status === 'error' || state.status === 'disconnected') {
      console.warn('[WA-RUNTIME] Watchdog: status is ' + state.status + ' — attempting reconnect')
      await destroyClient()
      await ensureClient().catch(() => {})
    }
  }, 60_000)
}

async function sendHumanLike(to: string, message: string, simulateTyping: boolean): Promise<SendResult> {
  if (!client || (state.status !== 'connected' && state.status !== 'authenticated')) {
    throw new Error('WA client is not connected')
  }

  const chatId = toChatId(to)
  let typingMs = 0
  let microDelayMs = 0

  if (simulateTyping) {
    const chat = await withTimeout(client.getChatById(chatId), 8_000, 'getChatById').catch((err: unknown) => {
      console.warn('[WA-RUNTIME] typing skipped:', err instanceof Error ? err.message : String(err))
      return null
    })
    if (chat) {
      typingMs = Math.min(calculateTypingMs(message.length), 8_000)
      await withTimeout(chat.sendStateTyping(), 5_000, 'sendStateTyping')
      try {
        await sleep(typingMs)
      } finally {
        await withTimeout(chat.clearState().catch(() => undefined), 5_000, 'clearState').catch(() => undefined)
      }
      microDelayMs = 500 + Math.round(Math.random() * 1000)
      await sleep(microDelayMs)
    }
  }

  const sent = await withTimeout(client.sendMessage(chatId, message), 25_000, 'sendMessage')

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
  startWatchdog()
  ensureClient().catch((err: unknown) => {
    state.lastError = err instanceof Error ? err.message : 'Startup failed'
    touch('error')
    console.error('[WA-RUNTIME] Startup failed:', err)
  })
}
