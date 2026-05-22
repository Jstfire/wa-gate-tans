import { Hono } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface TemplateRow {
  id: string
  name: string
  content: string
  variables: JsonValue
  category: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RequestBody {
  name?: unknown
  content?: unknown
  variables?: unknown
  category?: unknown
  isActive?: unknown
}

const templates = new Hono()

templates.use('*', authMiddleware)

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isJsonObject(value: unknown): value is { [key: string]: JsonValue } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(isJsonValue)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  return isJsonObject(value)
}

templates.get('/', requirePermission('templates'), async (c) => {
  try {
    const rest = getWagateClient()
    const rows = await rest.select<TemplateRow>('wa_templates_wagate')
    return c.json(rows)
  } catch (error) {
    return c.json({ error: 'Failed to fetch templates', detail: errorMessage(error) }, 500)
  }
})

templates.post('/', requirePermission('templates'), async (c: ApiContext) => {
  try {
    const rest = getWagateClient()
    const user = c.get('user')
    const body = await c.req.json<RequestBody>()
    const rows = await rest.insert<TemplateRow>('wa_templates_wagate', {
      name: String(body.name),
      content: String(body.content),
      variables: Array.isArray(body.variables) ? body.variables.map(String) : null,
      category: typeof body.category === 'string' ? body.category : null,
      is_active: typeof body.isActive === 'boolean' ? body.isActive : true,
    })
    return c.json(rows[0], 201)
  } catch (error) {
    return c.json({ error: 'Failed to create template', detail: errorMessage(error) }, 500)
  }
})

templates.put('/:id', requirePermission('templates'), async (c) => {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const body = await c.req.json<RequestBody>()
    const data: Record<string, JsonValue> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.content === 'string') data.content = body.content
    if (Array.isArray(body.variables)) data.variables = body.variables.map(String)
    if (typeof body.category === 'string') data.category = body.category
    if (typeof body.isActive === 'boolean') data.is_active = body.isActive

    const rows = await rest.update<TemplateRow>('wa_templates_wagate', data, { id: `eq.${id}` })
    const row = rows[0]
    if (!row) return c.json({ error: 'Template not found' }, 404)
    return c.json(row)
  } catch (error) {
    return c.json({ error: 'Failed to update template', detail: errorMessage(error) }, 500)
  }
})

templates.delete('/:id', requirePermission('templates'), async (c) => {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const rows = await rest.delete<TemplateRow>('wa_templates_wagate', { id: `eq.${id}` })
    if (!rows[0]) return c.json({ error: 'Template not found' }, 404)
    return c.json({ message: 'Template deleted' })
  } catch (error) {
    return c.json({ error: 'Failed to delete template', detail: errorMessage(error) }, 500)
  }
})

export default templates
