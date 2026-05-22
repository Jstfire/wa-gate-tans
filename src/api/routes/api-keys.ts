import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient } from '../../lib/supabase-rest'

interface ApiKeyRow {
  id: string
  name: string
  key: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string | null
  last_used_at: string | null
}

const apiKeys = new Hono()

apiKeys.use('*', authMiddleware)

apiKeys.get('/', requirePermission('api_keys'), async (c) => {
  try {
    const client = getWagateClient()
    const rows = await client.select<ApiKeyRow>('api_keys_wagate', { order: 'created_at.desc' })
    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch API keys' }, 500)
  }
})

apiKeys.post('/', requirePermission('api_keys'), async (c: ApiContext) => {
  try {
    const client = getWagateClient()
    const user = c.get('user')
    const body = await c.req.json<Record<string, unknown>>()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Field "name" is required' }, 400)
    }

    const key = `wg_${crypto.randomUUID().replace(/-/g, '')}`
    const [row] = await client.insert<ApiKeyRow>('api_keys_wagate', {
      name: body.name.trim(),
      key,
      is_active: true,
    })

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to create API key' }, 500)
  }
})

apiKeys.delete('/:id', requirePermission('api_keys'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id')
    const [row] = await client.update<ApiKeyRow>('api_keys_wagate', {
      is_active: false,
      updated_at: new Date().toISOString(),
    }, { id: `eq.${id}` })

    if (!row) return c.json({ error: 'API key not found' }, 404)
    return c.json({ message: 'API key revoked' })
  } catch {
    return c.json({ error: 'Failed to revoke API key' }, 500)
  }
})

export default apiKeys
