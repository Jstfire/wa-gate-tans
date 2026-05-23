import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'
import type { RuntimeEnv } from './wa-runtime'

interface MessageRow {
  id: string
  from_number: string
  to_number: string
  content: string
  direction: string
  status: string
  wa_message_id: string | null
  created_at: string
  updated_at: string | null
}

interface ContactRow {
  phone_number: string
  last_message: MessageRow | null
}

interface WaAccountNumberRow {
  phone_number: string | null
}

type JsMessage = {
  id: string
  waMessageId: string
  fromNumber: string
  toNumber: string
  messageType: string
  content: string | null
  direction: string
  status: string
  isFromBot: boolean
  createdAt: string
}

function mapMessage(row: MessageRow): JsMessage {
  return {
    id: row.id,
    waMessageId: row.wa_message_id ?? `msg_${row.id}`,
    fromNumber: row.from_number,
    toNumber: row.to_number,
    messageType: 'text',
    content: row.content,
    direction: row.direction,
    status: row.status,
    isFromBot: false,
    createdAt: row.created_at,
  }
}

function stripChatSuffix(value: string): string {
  return value.replace(/@c\.us$|@g\.us$|@lid$/g, '')
}

function chatVariants(value: string): string[] {
  const trimmed = value.trim()
  const base = stripChatSuffix(trimmed)
  return Array.from(new Set([trimmed, base, `${base}@c.us`, `${base}@lid`].filter(Boolean)))
}

function orEquals(columnNames: string[], values: string[]): string {
  return columnNames.flatMap((column) => values.map((value) => `${column}.eq.${value}`)).join(',')
}

async function getOwnNumber(client = getWagateClient()): Promise<string> {
  const accountRows = await client.select<WaAccountNumberRow>('wa_accounts_wagate', { limit: 1 })
  return stripChatSuffix(accountRows[0]?.phone_number ?? '')
}

const messages = new Hono()

messages.use('*', authMiddleware)

messages.get('/', requirePermission('wa_send'), async (c) => {
  try {
    const client = getWagateClient()
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const contact = c.req.query('contact')
    const offset = (page - 1) * limit

    const rows = await client.select<MessageRow>('messages_wagate', {
      filter: contact ? { or: `(from_number.eq.${contact},to_number.eq.${contact})` } : undefined,
      order: 'created_at.desc',
      limit,
      offset,
    })

    return c.json({ data: rows, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

messages.get('/contacts', requirePermission('wa_send'), async (c) => {
  try {
    const client = getWagateClient()
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const offset = (page - 1) * limit

    const rows = await client.select<MessageRow>('messages_wagate', { order: 'created_at.desc', limit: 200 })
    const contacts = new Map<string, ContactRow>()
    const ownNumber = await getOwnNumber(client)

    for (const message of rows) {
      for (const raw of [message.from_number, message.to_number]) {
        if (!raw) continue
        const phone = stripChatSuffix(raw)
        if (phone === ownNumber || phone === 'system' || !phone.startsWith('62')) continue
        if (!contacts.has(phone)) {
          contacts.set(phone, { phone_number: phone, last_message: message })
        }
      }
    }

    const data = Array.from(contacts.values()).slice(offset, offset + limit).map((item) => ({
      id: item.phone_number,
      phoneNumber: item.phone_number,
      name: null as string | null,
      lastMessageAt: item.last_message?.created_at ?? null,
      hasChatHistory: true,
    }))
    return c.json(data)
  } catch {
    return c.json({ error: 'Failed to fetch contacts' }, 500)
  }
})

messages.get('/conversation/:phone', requirePermission('wa_send'), async (c) => {
  try {
    const phone = c.req.param('phone')
    const variants = chatVariants(phone)
    const client = getWagateClient()
    const rows = await client.select<MessageRow>('messages_wagate', {
      filter: { or: `(${orEquals(['from_number', 'to_number'], variants)})` },
      order: 'created_at.asc',
      limit: 100,
    })
    return c.json(rows.map(mapMessage))
  } catch {
    return c.json({ error: 'Failed to fetch conversation' }, 500)
  }
})

messages.post('/send', requirePermission('wa_send'), async (c) => {
  try {
    const client = getWagateClient()
    const body = await c.req.json<Record<string, unknown>>()

    if (typeof body.to !== 'string' || !body.to.trim()) {
      return c.json({ error: 'Field "to" is required' }, 400)
    }
    if (typeof body.message !== 'string' || !body.message.trim()) {
      return c.json({ error: 'Field "message" is required' }, 400)
    }

    const to = body.to.trim()
    const message = body.message.trim()
    const env: RuntimeEnv = c.env as RuntimeEnv
    const runtimeResult = await sendViaRuntime(to, message, env)
    if (!runtimeResult.success) {
      return c.json({ error: runtimeResult.error ?? 'Failed to send message via WA runtime' }, 502)
    }

    const ourNumber = await getOwnNumber(client) || 'system'
    const messageId = runtimeResult.result?.messageId ?? `out_${crypto.randomUUID()}`

    const [row] = await client.insert<MessageRow>('messages_wagate', {
      wa_message_id: messageId,
      from_number: ourNumber,
      to_number: to,
      content: message,
      direction: 'outbound',
      status: 'sent',
    })

    return c.json({ ...row, runtime: runtimeResult.result }, 201)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to send message' }, 500)
  }
})

export default messages
