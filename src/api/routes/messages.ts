import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'

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

    const rows = await client.select<MessageRow>('messages_wagate', { order: 'created_at.desc' })
    const contacts = new Map<string, ContactRow>()

    for (const message of rows) {
      for (const phone of [message.from_number, message.to_number]) {
        if (phone && !contacts.has(phone)) {
          contacts.set(phone, { phone_number: phone, last_message: message })
        }
      }
    }

    const data = Array.from(contacts.values()).slice(offset, offset + limit)
    return c.json({ data, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch contacts' }, 500)
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
    const runtimeResult = await sendViaRuntime(to, message, c.env)
    if (!runtimeResult.success) {
      return c.json({ error: runtimeResult.error ?? 'Failed to send message via WA runtime' }, 502)
    }

    const ourNumber = process.env.WA_NUMBER ?? 'system'
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
