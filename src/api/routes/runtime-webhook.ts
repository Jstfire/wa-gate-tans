import { Hono } from 'hono'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'
import type { RuntimeEnv } from './wa-runtime'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

interface IncomingPayload { from?: unknown; to?: unknown; body?: unknown; messageId?: unknown; contactNumber?: unknown; contactName?: unknown }
interface MessageRow { id: string; from_number: string; to_number: string; content: string; direction: string; status: string; wa_message_id: string | null; created_at: string }
interface ContactRow { id: string; phone_number: string; name: string | null; metadata: JsonValue; has_chat_history: boolean }
interface WaAccountRow { id: string; phone_number: string | null; name: string | null; status: string; session_data: JsonValue; created_at: string }
interface TemplateRow { name: string; content: string; is_active: boolean }
interface ChatbotRuleRow { id: string; trigger: string; parent_trigger: string | null; response_type: string; response_content: string; response_metadata: JsonValue; order: number; is_active: boolean }
interface SessionMeta extends JsonObject { level: string | null; adminMode: boolean; lastWelcomeAt: string | null }

const runtimeWebhook = new Hono()

runtimeWebhook.get('/session', async (c) => {
  if (!isAuthorized(c.req.header('Authorization'), c.env as RuntimeEnv)) return c.json({ error: 'Unauthorized' }, 401)
  const account = await getWagateClient().selectOne<WaAccountRow>('wa_accounts_wagate', { order: 'updated_at.desc' })
  const data = metadataObject(account?.session_data ?? null)
  return c.json({ archiveBase64: typeof data.archiveBase64 === 'string' ? data.archiveBase64 : null })
})

runtimeWebhook.post('/session', async (c) => {
  if (!isAuthorized(c.req.header('Authorization'), c.env as RuntimeEnv)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<{ archiveBase64?: unknown; phoneNumber?: unknown; name?: unknown }>()
  if (typeof body.archiveBase64 !== 'string' || body.archiveBase64.length < 100) return c.json({ error: 'Invalid session archive' }, 400)
  const client = getWagateClient()
  const existing = await client.selectOne<WaAccountRow>('wa_accounts_wagate', { order: 'created_at.asc' })
  const payload: Record<string, JsonValue> = {
    phone_number: typeof body.phoneNumber === 'string' ? body.phoneNumber : existing?.phone_number ?? null,
    name: typeof body.name === 'string' ? body.name : existing?.name ?? null,
    status: 'connected',
    session_data: { archiveBase64: body.archiveBase64, backedUpAt: new Date().toISOString() },
    last_connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (existing) await client.update<WaAccountRow>('wa_accounts_wagate', payload, { id: `eq.${existing.id}` })
  else await client.insert<WaAccountRow>('wa_accounts_wagate', payload)
  return c.json({ ok: true })
})

function isAuthorized(header: string | undefined, env?: RuntimeEnv): boolean { const key = (env?.WA_RUNTIME_API_KEY ?? process.env.WA_RUNTIME_API_KEY ?? ''); return Boolean(key) && header === `Bearer ${key}` }
function phoneFromChatId(value: string): string { return value.replace(/@c\.us$|@g\.us$|@lid$/g, '') }
function inboundPhone(body: IncomingPayload): string {
  if (typeof body.contactNumber === 'string' && body.contactNumber.trim()) return phoneFromChatId(body.contactNumber)
  return typeof body.from === 'string' ? phoneFromChatId(body.from) : 'unknown'
}
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
async function ownNumber(client = getWagateClient()): Promise<string> {
  const account = await client.selectOne<{ phone_number: string | null }>('wa_accounts_wagate', { order: 'updated_at.desc' })
  return phoneFromChatId(account?.phone_number ?? '') || 'system'
}
async function sendAndLog(to: string, text: string, env?: RuntimeEnv): Promise<void> {
  const client = getWagateClient()
  let success = false
  let msgId = `bot_${crypto.randomUUID()}`
  try {
    const sent = await sendViaRuntime(to, text, env)
    success = sent.success
    msgId = sent.result?.messageId ?? msgId
  } catch (error) {
    console.error('[BOT] sendViaRuntime failed:', error instanceof Error ? error.message : error)
  }
  await client.insert<MessageRow>('messages_wagate', { wa_message_id: msgId, from_number: await ownNumber(client), to_number: to, content: text, message_type: 'text', direction: 'outbound', status: success ? 'sent' : 'failed', is_from_bot: true })
}
async function handleBot(contactPhone: string, replyTarget: string, text: string, env?: RuntimeEnv): Promise<void> {
  const client = getWagateClient()
  const [contact, rules, templates] = await Promise.all([
    client.selectOne<ContactRow>('contacts_wagate', { filter: { phone_number: `eq.${contactPhone}` } }),
    client.select<ChatbotRuleRow>('chatbot_rules_wagate', { order: 'order.asc' }),
    client.select<TemplateRow>('wa_templates_wagate'),
  ])
  const meta = metaOf(contact)
  const cmd = text.trim().toLowerCase()

  if (!meta.lastWelcomeAt && cmd !== 'menu') {
    meta.lastWelcomeAt = new Date().toISOString()
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'WELCOME_MESSAGE'), env)
    return
  }

  if (cmd === '99') {
    meta.level = null
    meta.adminMode = false
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env)
    return
  }

  if (meta.adminMode) {
    if (cmd === '00') { meta.adminMode = false; meta.level = null; await upsertContact(contactPhone, meta); await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env) }
    return
  }

  const rule = matchRule(rules, cmd, meta.level)
  if (!rule) {
    const fallback = templateContent(templates, 'MAIN_MENU')
    await sendAndLog(replyTarget, fallback, env)
    return
  }

  const response = templateContent(templates, rule.response_content)
  if (rule.response_type === 'admin') { meta.adminMode = true; await upsertContact(contactPhone, meta); await sendAndLog(replyTarget, response, env); return }
  if (rule.response_type === 'submenu') { meta.level = rule.trigger; await upsertContact(contactPhone, meta); await sendAndLog(replyTarget, response, env); return }
  if (rule.response_type === 'text' || rule.response_type === 'link' || rule.response_type === 'location' || rule.response_type === 'pdf') {
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, response, env)
    return
  }
}

runtimeWebhook.post('/incoming', async (c) => {
  if (!isAuthorized(c.req.header('Authorization'), c.env as RuntimeEnv)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<IncomingPayload>()
  if (typeof body.from !== 'string' || typeof body.body !== 'string') return c.json({ error: 'Invalid payload' }, 400)
  const from = inboundPhone(body), to = typeof body.to === 'string' ? phoneFromChatId(body.to) : (await ownNumber()), text = body.body.trim()
  const replyTarget = typeof body.from === 'string' && body.from.includes('@') ? body.from : from
  if (!text) return c.json({ ok: true, skipped: 'empty' })
  const client = getWagateClient()
  await client.insert<MessageRow>('messages_wagate', { wa_message_id: typeof body.messageId === 'string' ? body.messageId : `in_${crypto.randomUUID()}`, from_number: from, to_number: to, content: text, message_type: 'text', direction: 'inbound', status: 'received' })
  try {
    await handleBot(from, replyTarget, text, c.env as RuntimeEnv)
  } catch (error) {
    return c.json({ ok: true, botError: error instanceof Error ? error.message : String(error) })
  }
  return c.json({ ok: true })
})

export default runtimeWebhook
