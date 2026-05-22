import { Hono } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

interface IncomingPayload { from?: unknown; to?: unknown; body?: unknown; messageId?: unknown }
interface MessageRow { id: string; from_number: string; to_number: string; content: string; direction: string; status: string; wa_message_id: string | null; created_at: string }
interface ContactRow { id: string; phone_number: string; name: string | null; metadata: JsonValue; has_chat_history: boolean }
interface TemplateRow { name: string; content: string; is_active: boolean }
interface ChatbotRuleRow { id: string; trigger: string; parent_trigger: string | null; response_type: string; response_content: string; response_metadata: JsonValue; order: number; is_active: boolean }
interface SessionMeta extends JsonObject { level: string | null; adminMode: boolean; lastWelcomeAt: string | null }

const runtimeWebhook = new Hono()

function isAuthorized(header: string | undefined): boolean { const key = process.env.WA_RUNTIME_API_KEY ?? ''; return Boolean(key) && header === `Bearer ${key}` }
function phoneFromChatId(value: string): string { return value.replace(/@c\.us$|@g\.us$/g, '') }
function metadataObject(value: JsonValue): JsonObject { return value && typeof value === 'object' && !Array.isArray(value) ? value : {} }
function metaOf(row: ContactRow | null): SessionMeta {
  const raw = metadataObject(row?.metadata ?? null)
  return { ...raw, level: typeof raw.level === 'string' ? raw.level : null, adminMode: raw.adminMode === true, lastWelcomeAt: typeof raw.lastWelcomeAt === 'string' ? raw.lastWelcomeAt : null }
}
async function upsertContact(phone: string, meta: SessionMeta): Promise<void> {
  const client = getWagateClient()
  const existing = await client.selectOne<ContactRow>('contacts_wagate', { filter: { phone_number: `eq.${phone}` } })
  const data: Record<string, JsonValue> = { phone_number: phone, has_chat_history: true, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: meta }
  if (existing) await client.update<ContactRow>('contacts_wagate', data, { phone_number: `eq.${phone}` })
  else await client.insert<ContactRow>('contacts_wagate', data)
}
function matchRule(rules: ChatbotRuleRow[], trigger: string, parent: string | null): ChatbotRuleRow | null {
  return rules
    .filter((r) => r.is_active && r.trigger.trim().toLowerCase() === trigger && ((r.parent_trigger ?? null) === parent))
    .sort((a, b) => a.order - b.order)[0] ?? null
}
function templateContent(templates: TemplateRow[], nameOrContent: string): string {
  return templates.find((t) => t.is_active && t.name === nameOrContent)?.content ?? nameOrContent
}
async function sendAndLog(to: string, text: string): Promise<void> {
  const client = getWagateClient()
  const sent = await sendViaRuntime(to, text)
  await client.insert<MessageRow>('messages_wagate', { wa_message_id: sent.result?.messageId ?? `bot_${crypto.randomUUID()}`, from_number: process.env.WA_NUMBER ?? 'system', to_number: to, content: text, message_type: 'text', direction: 'outbound', status: sent.success ? 'sent' : 'failed', is_from_bot: true })
}
async function handleBot(from: string, text: string): Promise<void> {
  const client = getWagateClient()
  const [contact, rules, templates] = await Promise.all([
    client.selectOne<ContactRow>('contacts_wagate', { filter: { phone_number: `eq.${from}` } }),
    client.select<ChatbotRuleRow>('chatbot_rules_wagate', { order: 'order.asc' }),
    client.select<TemplateRow>('wa_templates_wagate'),
  ])
  const meta = metaOf(contact)
  const cmd = text.trim().toLowerCase()

  if (!meta.lastWelcomeAt && cmd !== 'menu') {
    meta.lastWelcomeAt = new Date().toISOString()
    await upsertContact(from, meta)
    await sendAndLog(from, templateContent(templates, 'WELCOME_MESSAGE'))
    return
  }

  if (cmd === '99') {
    meta.level = null
    meta.adminMode = false
    await upsertContact(from, meta)
    await sendAndLog(from, templateContent(templates, 'MAIN_MENU'))
    return
  }

  if (meta.adminMode) {
    if (cmd === '00') { meta.adminMode = false; meta.level = null; await upsertContact(from, meta); await sendAndLog(from, templateContent(templates, 'MAIN_MENU')) }
    return
  }

  const rule = matchRule(rules, cmd, meta.level)
  if (!rule) {
    const fallback = templateContent(templates, 'MAIN_MENU')
    await sendAndLog(from, fallback)
    return
  }

  const response = templateContent(templates, rule.response_content)
  if (rule.response_type === 'admin') { meta.adminMode = true; await upsertContact(from, meta); await sendAndLog(from, response); return }
  if (rule.response_type === 'submenu') { meta.level = rule.trigger; await upsertContact(from, meta); await sendAndLog(from, response); return }
  if (rule.response_type === 'text' || rule.response_type === 'link' || rule.response_type === 'location' || rule.response_type === 'pdf') {
    await upsertContact(from, meta)
    await sendAndLog(from, response)
    return
  }
}

runtimeWebhook.post('/incoming', async (c) => {
  if (!isAuthorized(c.req.header('Authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<IncomingPayload>()
  if (typeof body.from !== 'string' || typeof body.body !== 'string') return c.json({ error: 'Invalid payload' }, 400)
  const from = phoneFromChatId(body.from), to = typeof body.to === 'string' ? phoneFromChatId(body.to) : (process.env.WA_NUMBER ?? 'system'), text = body.body.trim()
  if (!text) return c.json({ ok: true, skipped: 'empty' })
  const client = getWagateClient()
  await client.insert<MessageRow>('messages_wagate', { wa_message_id: typeof body.messageId === 'string' ? body.messageId : `in_${crypto.randomUUID()}`, from_number: from, to_number: to, content: text, message_type: 'text', direction: 'inbound', status: 'received' })
  await handleBot(from, text)
  return c.json({ ok: true })
})

export default runtimeWebhook
