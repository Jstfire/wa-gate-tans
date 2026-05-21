import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { officer_numbers_wagate } from '../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

const officers = new Hono()

officers.use('*', authMiddleware)

officers.get('/', requirePermission('chatbot'), async (c) => {
  const rows = await db.select().from(officer_numbers_wagate)
  return c.json(rows)
})

officers.post('/', requirePermission('chatbot'), async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(officer_numbers_wagate).values({
    name: String(body.name),
    phoneNumber: String(body.phoneNumber),
    position: typeof body.position === 'string' ? body.position : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  }).returning()
  return c.json(row, 201)
})

officers.put('/:id', requirePermission('chatbot'), async (c) => {
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const [row] = await db.update(officer_numbers_wagate).set({
    name: typeof body.name === 'string' ? body.name : undefined,
    phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber : undefined,
    position: typeof body.position === 'string' ? body.position : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    updatedAt: new Date(),
  }).where(eq(officer_numbers_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Officer not found' }, 404)
  return c.json(row)
})

officers.delete('/:id', requirePermission('chatbot'), async (c) => {
  const id = c.req.param('id') as string
  const [row] = await db.delete(officer_numbers_wagate).where(eq(officer_numbers_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Officer not found' }, 404)
  return c.json({ message: 'Officer deleted' })
})

export default officers
