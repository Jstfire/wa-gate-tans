import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { chatbot_rules_wagate } from '../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

const chatbot = new Hono()

chatbot.use('*', authMiddleware)

chatbot.get('/rules', requirePermission('chatbot'), async (c) => {
  const rows = await db.select().from(chatbot_rules_wagate)
  return c.json(rows)
})

chatbot.post('/rules', requirePermission('chatbot'), async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(chatbot_rules_wagate).values({
    trigger: String(body.trigger),
    parentTrigger: typeof body.parentTrigger === 'string' ? body.parentTrigger : undefined,
    responseType: String(body.responseType),
    responseContent: String(body.responseContent),
    responseMetadata: typeof body.responseMetadata === 'object' ? body.responseMetadata : undefined,
    order: typeof body.order === 'number' ? body.order : 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  }).returning()
  return c.json(row, 201)
})

chatbot.put('/rules/:id', requirePermission('chatbot'), async (c) => {
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const [row] = await db.update(chatbot_rules_wagate).set({
    trigger: typeof body.trigger === 'string' ? body.trigger : undefined,
    parentTrigger: typeof body.parentTrigger === 'string' ? body.parentTrigger : undefined,
    responseType: typeof body.responseType === 'string' ? body.responseType : undefined,
    responseContent: typeof body.responseContent === 'string' ? body.responseContent : undefined,
    responseMetadata: typeof body.responseMetadata === 'object' ? body.responseMetadata : undefined,
    order: typeof body.order === 'number' ? body.order : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    updatedAt: new Date(),
  }).where(eq(chatbot_rules_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Rule not found' }, 404)
  return c.json(row)
})

chatbot.delete('/rules/:id', requirePermission('chatbot'), async (c) => {
  const id = c.req.param('id') as string
  const [row] = await db.delete(chatbot_rules_wagate).where(eq(chatbot_rules_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Rule not found' }, 404)
  return c.json({ message: 'Rule deleted' })
})

export default chatbot
