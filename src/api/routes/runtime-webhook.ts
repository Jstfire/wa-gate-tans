import { Hono } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface IncomingPayload {
  from?: unknown
  to?: unknown
  body?: unknown
  messageId?: unknown
  timestamp?: unknown
}

interface MessageRow {
  id: string
  from_number: string
  to_number: string
  content: string
  direction: string
  status: string
  wa_message_id: string | null
  created_at: string
}

interface ChatbotRuleRow {
  id: string
  trigger: string
  response_type: string
  response_content: string
  response_metadata: JsonValue
  order: number
  is_active: boolean
}

const runtimeWebhook = new Hono()

function runtimeKey(): string {
  return process.env.WA_RUNTIME_API_KEY ?? ''
}

function isAuthorized(header: string | undefined): boolean {
  const key = runtimeKey()
  return Boolean(key) && header === `Bearer ${key}`
}

function phoneFromChatId(value: string): string {
  return value.replace(/@c\.us$|@g\.us$/g, '')
}

function findRule(rules: ChatbotRuleRow[], text: string): ChatbotRuleRow | null {
  const normalized = text.toLowerCase().trim()
  return rules
    .filter((rule) => rule.is_active)
    .sort((a, b) => a.order - b.order)
    .find((rule) => {
      const trigger = rule.trigger.toLowerCase().trim()
      return trigger.length > 0 && (normalized === trigger || normalized.includes(trigger))
    }) ?? null
}

async function maybeReply(from: string, text: string): Promise<string | null> {
  const client = getWagateClient()
  const rules = await client.select<ChatbotRuleRow>('chatbot_rules_wagate', { order: 'order.asc' })
  const rule = findRule(rules, text)
  if (!rule) return null

  let reply = rule.response_content
  if (rule.response_type === 'link' && rule.response_metadata && typeof rule.response_metadata === 'object' && !Array.isArray(rule.response_metadata)) {
    const url = rule.response_metadata.link_url
    if (typeof url === 'string' && url.trim()) reply = `${reply}\n${url}`
  }

  const sent = await sendViaRuntime(from, reply)
  if (sent.success) {
    await client.insert<MessageRow>('messages_wagate', {
      wa_message_id: sent.result?.messageId ?? `bot_${crypto.randomUUID()}`,
      from_number: process.env.WA_NUMBER ?? 'system',
      to_number: from,
      content: reply,
      direction: 'outbound',
      status: 'sent',
    })
  }
  return reply
}

runtimeWebhook.post('/incoming', async (c) => {
  if (!isAuthorized(c.req.header('Authorization'))) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json<IncomingPayload>()
  if (typeof body.from !== 'string' || typeof body.body !== 'string') {
    return c.json({ error: 'Invalid payload' }, 400)
  }

  const from = phoneFromChatId(body.from)
  const to = typeof body.to === 'string' ? phoneFromChatId(body.to) : (process.env.WA_NUMBER ?? 'system')
  const text = body.body.trim()
  if (!text) return c.json({ ok: true, skipped: 'empty' })

  const client = getWagateClient()
  await client.insert<MessageRow>('messages_wagate', {
    wa_message_id: typeof body.messageId === 'string' ? body.messageId : `in_${crypto.randomUUID()}`,
    from_number: from,
    to_number: to,
    content: text,
    direction: 'inbound',
    status: 'received',
  })

  const reply = await maybeReply(from, text)
  return c.json({ ok: true, replied: Boolean(reply) })
})

export default runtimeWebhook
