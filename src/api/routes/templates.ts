import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { wa_templates_wagate } from '../../db/schema'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';
import { requirePermission } from '../middleware/permission'

const templates = new Hono()

templates.use('*', authMiddleware)

templates.get('/', requirePermission('templates'), async (c) => {
  const rows = await db.select().from(wa_templates_wagate)
  return c.json(rows)
})

templates.post('/', requirePermission('templates'), async (c: ApiContext) => {
  const user = c.get('user')
  const body = await c.req.json()
  const [row] = await db.insert(wa_templates_wagate).values({
    name: String(body.name),
    content: String(body.content),
    variables: Array.isArray(body.variables) ? body.variables.map(String) : undefined,
    category: typeof body.category === 'string' ? body.category : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    createdBy: user.id,
  }).returning()
  return c.json(row, 201)
})

templates.put('/:id', requirePermission('templates'), async (c) => {
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const [row] = await db.update(wa_templates_wagate).set({
    name: typeof body.name === 'string' ? body.name : undefined,
    content: typeof body.content === 'string' ? body.content : undefined,
    variables: Array.isArray(body.variables) ? body.variables.map(String) : undefined,
    category: typeof body.category === 'string' ? body.category : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    updatedAt: new Date(),
  }).where(eq(wa_templates_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Template not found' }, 404)
  return c.json(row)
})

templates.delete('/:id', requirePermission('templates'), async (c) => {
  const id = c.req.param('id') as string
  const [row] = await db.delete(wa_templates_wagate).where(eq(wa_templates_wagate.id, id)).returning()
  if (!row) return c.json({ error: 'Template not found' }, 404)
  return c.json({ message: 'Template deleted' })
})

export default templates
