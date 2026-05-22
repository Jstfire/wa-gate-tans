import { Hono } from 'hono'
import type { Context } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface ChatbotRuleRow {
  id: string
  trigger: string
  parent_trigger: string | null
  response_type: string
  response_content: string
  response_metadata: JsonValue
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RequestBody {
  trigger?: unknown
  parentTrigger?: unknown
  responseType?: unknown
  responseContent?: unknown
  responseMetadata?: unknown
  order?: unknown
  isActive?: unknown
}

const chatbot = new Hono()

chatbot.use('*', authMiddleware)

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

async function listRules(c: Context) {
  try {
    const rest = getWagateClient()
    const rows = await rest.select<ChatbotRuleRow>('chatbot_rules_wagate')
    return c.json({ data: rows })
  } catch (error) {
    return c.json({ error: 'Failed to fetch chatbot rules', detail: errorMessage(error) }, 500)
  }
}

async function createRule(c: Context) {
  try {
    const rest = getWagateClient()
    const body = await c.req.json<RequestBody>()
    const rows = await rest.insert<ChatbotRuleRow>('chatbot_rules_wagate', {
      trigger: String(body.trigger),
      parent_trigger: typeof body.parentTrigger === 'string' ? body.parentTrigger : null,
      response_type: String(body.responseType),
      response_content: String(body.responseContent),
      response_metadata: isJsonValue(body.responseMetadata) ? body.responseMetadata : null,
      order: typeof body.order === 'number' ? body.order : 0,
      is_active: typeof body.isActive === 'boolean' ? body.isActive : true,
    })
    return c.json(rows[0], 201)
  } catch (error) {
    return c.json({ error: 'Failed to create chatbot rule', detail: errorMessage(error) }, 500)
  }
}

async function updateRule(c: Context) {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const body = await c.req.json<RequestBody>()
    const data: Record<string, JsonValue> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.trigger === 'string') data.trigger = body.trigger
    if (typeof body.parentTrigger === 'string') data.parent_trigger = body.parentTrigger
    if (typeof body.responseType === 'string') data.response_type = body.responseType
    if (typeof body.responseContent === 'string') data.response_content = body.responseContent
    if (isJsonValue(body.responseMetadata)) data.response_metadata = body.responseMetadata
    if (typeof body.order === 'number') data.order = body.order
    if (typeof body.isActive === 'boolean') data.is_active = body.isActive

    const rows = await rest.update<ChatbotRuleRow>('chatbot_rules_wagate', data, { id: `eq.${id}` })
    const row = rows[0]
    if (!row) return c.json({ error: 'Rule not found' }, 404)
    return c.json(row)
  } catch (error) {
    return c.json({ error: 'Failed to update chatbot rule', detail: errorMessage(error) }, 500)
  }
}

async function deleteRule(c: Context) {
  try {
    const rest = getWagateClient()
    const id = c.req.param('id')
    const rows = await rest.delete<ChatbotRuleRow>('chatbot_rules_wagate', { id: `eq.${id}` })
    if (!rows[0]) return c.json({ error: 'Rule not found' }, 404)
    return c.json({ message: 'Rule deleted' })
  } catch (error) {
    return c.json({ error: 'Failed to delete chatbot rule', detail: errorMessage(error) }, 500)
  }
}

chatbot.get('/', requirePermission('chatbot'), listRules)
chatbot.post('/', requirePermission('chatbot'), createRule)
chatbot.put('/:id', requirePermission('chatbot'), updateRule)
chatbot.delete('/:id', requirePermission('chatbot'), deleteRule)

chatbot.get('/rules', requirePermission('chatbot'), listRules)
chatbot.post('/rules', requirePermission('chatbot'), createRule)
chatbot.put('/rules/:id', requirePermission('chatbot'), updateRule)
chatbot.delete('/rules/:id', requirePermission('chatbot'), deleteRule)

export default chatbot
