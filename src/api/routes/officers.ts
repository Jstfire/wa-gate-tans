import { Hono } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface OfficerRow {
  id: string
  name: string
  phone_number: string
  position: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RequestBody {
  name?: unknown
  phoneNumber?: unknown
  position?: unknown
  isActive?: unknown
}

const officers = new Hono()

officers.use('*', authMiddleware)

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

officers.get('/', requirePermission('chatbot'), async (c) => {
  try {
    const rest = getWagateClient()
    const rows = await rest.select<OfficerRow>('officer_numbers_wagate')
    return c.json({ data: rows })
  } catch (error) {
    return c.json({ error: 'Failed to fetch officers', detail: errorMessage(error) }, 500)
  }
})

officers.post('/', requirePermission('chatbot'), async (c) => {
  try {
    const rest = getWagateClient()
    const body = await c.req.json<RequestBody>()
    const rows = await rest.insert<OfficerRow>('officer_numbers_wagate', {
      name: String(body.name),
      phone_number: String(body.phoneNumber),
      position: typeof body.position === 'string' ? body.position : null,
      is_active: typeof body.isActive === 'boolean' ? body.isActive : true,
    })
    return c.json(rows[0], 201)
  } catch (error) {
    return c.json({ error: 'Failed to create officer', detail: errorMessage(error) }, 500)
  }
})

officers.put('/:id', requirePermission('chatbot'), async (c) => {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const body = await c.req.json<RequestBody>()
    const data: Record<string, JsonValue> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.phoneNumber === 'string') data.phone_number = body.phoneNumber
    if (typeof body.position === 'string') data.position = body.position
    if (typeof body.isActive === 'boolean') data.is_active = body.isActive

    const rows = await rest.update<OfficerRow>('officer_numbers_wagate', data, { id: `eq.${id}` })
    const row = rows[0]
    if (!row) return c.json({ error: 'Officer not found' }, 404)
    return c.json(row)
  } catch (error) {
    return c.json({ error: 'Failed to update officer', detail: errorMessage(error) }, 500)
  }
})

officers.delete('/:id', requirePermission('chatbot'), async (c) => {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const rows = await rest.delete<OfficerRow>('officer_numbers_wagate', { id: `eq.${id}` })
    if (!rows[0]) return c.json({ error: 'Officer not found' }, 404)
    return c.json({ message: 'Officer deleted' })
  } catch (error) {
    return c.json({ error: 'Failed to delete officer', detail: errorMessage(error) }, 500)
  }
})

export default officers
