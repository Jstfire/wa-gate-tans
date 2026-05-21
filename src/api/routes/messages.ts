import { Hono } from 'hono'
import { eq, or, desc } from 'drizzle-orm'
import { db } from '../../db'
import { messages_wagate, contacts_wagate } from '../../db/schema'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';
import { requirePermission } from '../middleware/permission'

const messages = new Hono()

messages.use('*', authMiddleware)

// GET /messages — list with pagination, optional ?contact=phone filter
messages.get('/', requirePermission('wa_send'), async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const contact = c.req.query('contact')
    const offset = (page - 1) * limit

    const rows = contact
      ? await db.select().from(messages_wagate)
          .where(or(eq(messages_wagate.fromNumber, contact), eq(messages_wagate.toNumber, contact)))
          .orderBy(desc(messages_wagate.createdAt))
          .limit(limit)
          .offset(offset)
      : await db.select().from(messages_wagate)
          .orderBy(desc(messages_wagate.createdAt))
          .limit(limit)
          .offset(offset)

    return c.json({ data: rows, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

// GET /messages/contacts — list contacts ordered by last message
messages.get('/contacts', requirePermission('wa_send'), async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const offset = (page - 1) * limit

    const contacts = await db.select().from(contacts_wagate)
      .orderBy(desc(contacts_wagate.lastMessageAt))
      .limit(limit)
      .offset(offset)

    // Fetch last message for each contact
    const phones = contacts.map((ct) => ct.phoneNumber)
    const lastMessages = phones.length > 0
      ? await Promise.all(
          phones.map((phone) =>
            db.select().from(messages_wagate)
              .where(or(eq(messages_wagate.fromNumber, phone), eq(messages_wagate.toNumber, phone)))
              .orderBy(desc(messages_wagate.createdAt))
              .limit(1)
              .then((rows) => ({ phone, message: rows[0] ?? null }))
          )
        )
      : []

    const lastMessageMap = new Map(lastMessages.map((lm) => [lm.phone, lm.message]))

    const data = contacts.map((ct) => ({
      ...ct,
      lastMessage: lastMessageMap.get(ct.phoneNumber) ?? null,
    }))

    return c.json({ data, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch contacts' }, 500)
  }
})

// GET /messages/conversation/:phone — full conversation history
messages.get('/conversation/:phone', requirePermission('wa_send'), async (c) => {
  try {
    const phone = c.req.param('phone') as string
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '50')))
    const offset = (page - 1) * limit

    const rows = await db.select().from(messages_wagate)
      .where(or(eq(messages_wagate.fromNumber, phone), eq(messages_wagate.toNumber, phone)))
      .orderBy(desc(messages_wagate.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({ data: rows, phone, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch conversation' }, 500)
  }
})

// POST /messages/send — save outbound message to DB (WA service picks it up)
messages.post('/send', requirePermission('wa_send'), async (c: ApiContext) => {
  try {
    const body = await c.req.json()
    if (typeof body.to !== 'string' || !body.to.trim()) {
      return c.json({ error: 'Field "to" is required' }, 400)
    }
    if (typeof body.message !== 'string' || !body.message.trim()) {
      return c.json({ error: 'Field "message" is required' }, 400)
    }

    const ourNumber = process.env.WA_NUMBER ?? 'system'
    const tempId = `pending_${crypto.randomUUID()}`

    const [row] = await db.insert(messages_wagate).values({
      waMessageId: tempId,
      fromNumber: ourNumber,
      toNumber: body.to.trim(),
      messageType: 'text',
      content: body.message.trim(),
      direction: 'outbound',
      status: 'pending',
      isFromBot: false,
    }).returning()

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to save message' }, 500)
  }
})

export default messages
