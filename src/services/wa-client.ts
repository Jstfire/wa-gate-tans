import { Client, LocalAuth } from 'whatsapp-web.js'
import type { Message as WaMessage } from 'whatsapp-web.js'
import { db } from '../db/index'
import { wa_accounts_wagate } from '../db/schema/wa'
import { messages_wagate, contacts_wagate } from '../db/schema/messages'
import { toWhatsAppChatId, normalizePhoneNumber } from '../lib/phone'
import { eq } from 'drizzle-orm'

type WaStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Forward declaration — chatbot-engine imports this file, so we lazy-import to avoid circular deps
type ChatbotProcessor = (from: string, text: string, manager: WaClientManager) => Promise<void>

function calcTypingDuration(messageLength: number): number {
  const base = (messageLength / 250) * 60 * 1000
  const variation = base * 0.2 * (Math.random() * 2 - 1)
  return Math.max(3000, Math.min(45000, base + variation))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class WaClientManager {
  private static instance: WaClientManager
  private client: Client | null = null
  private status: WaStatus = 'disconnected'
  private qrCode: string | null = null
  private chatbotProcessor: ChatbotProcessor | null = null

  private constructor() {}

  static getInstance(): WaClientManager {
    if (!WaClientManager.instance) {
      WaClientManager.instance = new WaClientManager()
    }
    return WaClientManager.instance
  }

  /** Inject chatbot processor after construction to avoid circular imports */
  setChatbotProcessor(fn: ChatbotProcessor): void {
    this.chatbotProcessor = fn
  }

  async initialize(): Promise<void> {
    if (this.client) {
      console.log('[WA] Client already initialized')
      return
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    })

    this.client.on('qr', async (qr: string) => {
      console.log('[WA] QR received')
      this.qrCode = qr
      this.status = 'connecting'
      await this.upsertAccount({ status: 'connecting', qrCode: qr })
    })

    this.client.on('ready', async () => {
      console.log('[WA] Client ready')
      this.status = 'connected'
      this.qrCode = null
      const phone = this.client?.info?.wid?.user ?? null
      const name = this.client?.info?.pushname ?? null
      await this.upsertAccount({
        status: 'connected',
        qrCode: null,
        phoneNumber: phone ? normalizePhoneNumber(phone) : null,
        name,
        lastConnectedAt: new Date(),
      })
    })

    this.client.on('disconnected', async (reason: string) => {
      console.log('[WA] Disconnected:', reason)
      this.status = 'disconnected'
      this.client = null
      await this.upsertAccount({ status: 'disconnected' })
    })

    this.client.on('message', async (msg: WaMessage) => {
      if (msg.fromMe) return
      await this.handleIncomingMessage(msg)
    })

    this.status = 'connecting'
    await this.client.initialize()
  }

  getStatus(): WaStatus {
    return this.status
  }

  getQrCode(): string | null {
    return this.qrCode
  }

  isReady(): boolean {
    return this.status === 'connected' && this.client !== null
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy()
      this.client = null
    }
    this.status = 'disconnected'
    await this.upsertAccount({ status: 'disconnected' })
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.client || !this.isReady()) {
      throw new Error('WA client is not ready')
    }

    const chatId = toWhatsAppChatId(to)
    const duration = calcTypingDuration(message.length)
    const chat = await this.client.getChatById(chatId)

    try {
      await chat.sendStateTyping()
      await sleep(duration)
    } finally {
      await chat.clearState()
    }

    // Micro-delay after clearing state (1–3s)
    const microDelay = Math.floor(Math.random() * 2000) + 1000
    await sleep(microDelay)

    await this.client.sendMessage(chatId, message)

    // Save outbound message to DB
    const myPhone = this.client.info?.wid?.user
      ? normalizePhoneNumber(this.client.info.wid.user)
      : 'unknown'

    await db.insert(messages_wagate).values({
      waMessageId: `out_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      fromNumber: myPhone,
      toNumber: normalizePhoneNumber(to),
      messageType: 'text',
      content: message,
      direction: 'outbound',
      status: 'sent',
      isFromBot: true,
    })
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async handleIncomingMessage(msg: WaMessage): Promise<void> {
    const from = normalizePhoneNumber(msg.from.replace('@c.us', ''))
    const to = msg.to ? normalizePhoneNumber(msg.to.replace('@c.us', '')) : 'unknown'

    // Persist message
    try {
      await db.insert(messages_wagate).values({
        waMessageId: msg.id.id,
        fromNumber: from,
        toNumber: to,
        messageType: msg.type ?? 'text',
        content: msg.body ?? null,
        direction: 'inbound',
        status: 'delivered',
        isFromBot: false,
      })
    } catch (err) {
      // Duplicate waMessageId — already saved
      console.warn('[WA] Duplicate message skipped:', msg.id.id)
    }

    // Upsert contact
    await this.upsertContact(from, msg)

    // Trigger chatbot
    if (this.chatbotProcessor && msg.body) {
      try {
        await this.chatbotProcessor(from, msg.body, this)
      } catch (err) {
        console.error('[WA] Chatbot processor error:', err)
      }
    }
  }

  private async upsertContact(phone: string, msg: WaMessage): Promise<void> {
    const existing = await db
      .select()
      .from(contacts_wagate)
      .where(eq(contacts_wagate.phoneNumber, phone))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(contacts_wagate)
        .set({ hasChatHistory: true, lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(contacts_wagate.phoneNumber, phone))
    } else {
      const contact = await msg.getContact()
      await db.insert(contacts_wagate).values({
        phoneNumber: phone,
        name: contact?.pushname ?? contact?.name ?? null,
        hasChatHistory: true,
        lastMessageAt: new Date(),
      })
    }
  }

  private async upsertAccount(
    data: Partial<{
      status: WaStatus
      qrCode: string | null
      phoneNumber: string | null
      name: string | null
      lastConnectedAt: Date
    }>
  ): Promise<void> {
    try {
      const existing = await db.select().from(wa_accounts_wagate).limit(1)
      if (existing.length > 0) {
        await db
          .update(wa_accounts_wagate)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(wa_accounts_wagate.id, existing[0].id))
      } else {
        await db.insert(wa_accounts_wagate).values({
          status: data.status ?? 'disconnected',
          qrCode: data.qrCode ?? null,
          phoneNumber: data.phoneNumber ?? null,
          name: data.name ?? null,
          lastConnectedAt: data.lastConnectedAt ?? null,
        })
      }
    } catch (err) {
      console.error('[WA] upsertAccount error:', err)
    }
  }
}

export const waClientManager = WaClientManager.getInstance()
