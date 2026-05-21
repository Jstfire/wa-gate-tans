import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../db'
import { api_keys_wagate } from '../../db/schema'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';
import { requirePermission } from '../middleware/permission'

const apiKeys = new Hono()

apiKeys.use('*', authMiddleware)

// GET /api-keys — list API keys
apiKeys.get('/', requirePermission('api_keys'), async (c) => {
  try {
    const rows = await db.select({
      id: api_keys_wagate.id,
      name: api_keys_wagate.name,
      key: api_keys_wagate.key,
      createdBy: api_keys_wagate.createdBy,
      lastUsedAt: api_keys_wagate.lastUsedAt,
      isActive: api_keys_wagate.isActive,
      createdAt: api_keys_wagate.createdAt,
      updatedAt: api_keys_wagate.updatedAt,
    }).from(api_keys_wagate)
      .orderBy(desc(api_keys_wagate.createdAt))

    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch API keys' }, 500)
  }
})

// POST /api-keys — generate new API key
apiKeys.post('/', requirePermission('api_keys'), async (c: ApiContext) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Field "name" is required' }, 400)
    }

    const key = `wg_${crypto.randomUUID().replace(/-/g, '')}`

    const [row] = await db.insert(api_keys_wagate).values({
      name: body.name.trim(),
      key,
      createdBy: user.id,
      isActive: true,
    }).returning()

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to create API key' }, 500)
  }
})

// DELETE /api-keys/:id — revoke (set isActive=false)
apiKeys.delete('/:id', requirePermission('api_keys'), async (c) => {
  try {
    const id = c.req.param('id') as string

    const [row] = await db.update(api_keys_wagate)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(api_keys_wagate.id, id))
      .returning()

    if (!row) return c.json({ error: 'API key not found' }, 404)

    return c.json({ message: 'API key revoked' })
  } catch {
    return c.json({ error: 'Failed to revoke API key' }, 500)
  }
})

export default apiKeys
