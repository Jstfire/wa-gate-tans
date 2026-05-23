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

interface SessionMeta extends JsonObject { level: string | null; adminMode: boolean; lastWelcomeAt: string | null; menuActive: boolean }

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
  return { ...raw, level: typeof raw.level === 'string' ? raw.level : null, adminMode: raw.adminMode === true, lastWelcomeAt: typeof raw.lastWelcomeAt === 'string' ? raw.lastWelcomeAt : null, menuActive: raw.menuActive === true }
}
async function upsertContact(phone: string, meta: SessionMeta): Promise<void> {
  const client = getWagateClient()
  const existing = await client.selectOne<ContactRow>('contacts_wagate', { filter: { phone_number: `eq.${phone}` } })
  const data: Record<string, JsonValue> = { phone_number: phone, has_chat_history: true, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: meta }
  if (existing) await client.update<ContactRow>('contacts_wagate', data, { phone_number: `eq.${phone}` })
  else await client.insert<ContactRow>('contacts_wagate', data)
}
function templateContent(templates: TemplateRow[], nameOrContent: string): string {
  return templates.find((t) => t.is_active && t.name === nameOrContent)?.content ?? nameOrContent
}
async function sendTemplateSequence(to: string, templates: TemplateRow[], names: string[], env?: RuntimeEnv): Promise<void> {
  for (const name of names) {
    await sendAndLog(to, templateContent(templates, name), env)
  }
}
async function sendLocationTextSequence(to: string, templates: TemplateRow[], env?: RuntimeEnv): Promise<void> {
  await sendAndLog(to, templateContent(templates, 'WAITING'), env)
  await sendAndLog(to, `${templateContent(templates, 'LOKASI')}\nhttps://maps.app.goo.gl/e66zfh8eGxsqj2ET7`, env)
  await sendTemplateSequence(to, templates, ['JADWAL_BUKA', 'THANKS', 'MAIN_MENU_NEXT'], env)
}
async function sendPerpustakaanMenuItem(to: string, templates: TemplateRow[], choice: string, env?: RuntimeEnv): Promise<void> {
  if (choice === '1') {
    await sendAndLog(to, templateContent(templates, 'WAITING'), env)
    await sendAndLog(to, '*📚 Kunjungi PST Online:* \nhttps://perpustakaan.bps.go.id/opac/', env)
    await sendTemplateSequence(to, templates, ['THANKS', 'SUB_MENU_PERPUSTAKAAN'], env)
    return
  }
  if (choice === '2') {
    await sendAndLog(to, templateContent(templates, 'WAITING'), env)
    await sendAndLog(to, `${templateContent(templates, 'LOKASI')}\nhttps://maps.app.goo.gl/e66zfh8eGxsqj2ET7`, env)
    await sendTemplateSequence(to, templates, ['JADWAL_BUKA', 'THANKS', 'SUB_MENU_PERPUSTAKAAN'], env)
    return
  }
  await sendTemplateSequence(to, templates, ['INVALID', 'SUB_MENU_PERPUSTAKAAN'], env)
}
async function sendRecommendationMenuItem(to: string, templates: TemplateRow[], choice: string, env?: RuntimeEnv): Promise<'admin' | 'handled'> {
  if (choice === '1') {
    await sendAndLog(to, templateContent(templates, 'WAITING'), env)
    await sendAndLog(to, '*🔗 Akses Romantik:* \nhttps://romantik.web.bps.go.id/', env)
    await sendTemplateSequence(to, templates, ['THANKS', 'SUB_MENU_REKOMENDASI'], env)
    return 'handled'
  }
  if (choice === '2') return 'admin'
  await sendTemplateSequence(to, templates, ['INVALID', 'SUB_MENU_REKOMENDASI'], env)
  return 'handled'
}
async function sendConsultationMenuItem(to: string, templates: TemplateRow[], choice: string, env?: RuntimeEnv): Promise<'admin' | 'handled'> {
  if (choice === '1') return 'admin'
  if (choice === '2') {
    await sendAndLog(to, templateContent(templates, 'WAITING'), env)
    await sendAndLog(to, `${templateContent(templates, 'LOKASI')}\nhttps://maps.app.goo.gl/e66zfh8eGxsqj2ET7`, env)
    await sendTemplateSequence(to, templates, ['JADWAL_BUKA', 'THANKS', 'SUB_MENU_KONSULTASI'], env)
    return 'handled'
  }
  await sendTemplateSequence(to, templates, ['INVALID', 'SUB_MENU_KONSULTASI'], env)
  return 'handled'
}
async function sendKcdaMenuItem(to: string, templates: TemplateRow[], choice: string, env?: RuntimeEnv): Promise<void> {
  const pdfMap: Record<string, string> = {
    '1': 'Kecamatan Batu Atas Dalam Angka 2025.pdf',
    '2': 'Kecamatan Lapandewa Dalam Angka 2025.pdf',
    '3': 'Kecamatan Sampolawa Dalam Angka 2025.pdf',
    '4': 'Kecamatan Batauga Dalam Angka 2025.pdf',
    '5': 'Kecamatan Siompu Barat Dalam Angka 2025.pdf',
    '6': 'Kecamatan Siompu Dalam Angka 2025.pdf',
    '7': 'Kecamatan Kadatua Dalam Angka 2025.pdf',
  }
  const filename = pdfMap[choice]
  if (!filename) { await sendTemplateSequence(to, templates, ['INVALID', 'SUB_MENU_PUBLIKASI_KCDA'], env); return }
  await sendAndLog(to, templateContent(templates, 'WAITING'), env)
  await sendAndLog(to, `${templateContent(templates, 'PUBLIKASI')}\n${filename}`, env)
  await sendTemplateSequence(to, templates, ['WEB_BUSEL', 'THANKS', 'SUB_MENU_PUBLIKASI_KCDA'], env)
}
async function sendLocationSubMenuItem(to: string, templates: TemplateRow[], choice: string, env?: RuntimeEnv): Promise<void> {
  if (choice === '1') {
    await sendAndLog(to, templateContent(templates, 'WAITING'), env)
    await sendAndLog(to, `${templateContent(templates, 'LOKASI')}\nhttps://maps.app.goo.gl/e66zfh8eGxsqj2ET7`, env)
    await sendTemplateSequence(to, templates, ['THANKS', 'SUB_MENU_LOKASI_JADWAL'], env)
    return
  }
  if (choice === '2') { await sendTemplateSequence(to, templates, ['WAITING', 'JADWAL_BUKA', 'THANKS', 'SUB_MENU_LOKASI_JADWAL'], env); return }
  await sendTemplateSequence(to, templates, ['INVALID', 'SUB_MENU_LOKASI_JADWAL'], env)
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
const adminNotifyCache = new Map<string, number>()
const ADMIN_NOTIFY_MS = 24 * 60 * 60 * 1000
function shouldNotifyAdmin(phone: string): boolean {
  const last = adminNotifyCache.get(phone)
  if (!last) return true
  return Date.now() - last > ADMIN_NOTIFY_MS
}
function recordAdminNotify(phone: string): void { adminNotifyCache.set(phone, Date.now()) }
async function notifyAdmins(fromPhone: string, msgText: string, env?: RuntimeEnv): Promise<void> {
  const client = getWagateClient()
  const officers = await client.select<{ phone_number: string }>('officer_numbers_wagate', { filter: { is_active: 'eq.true' } })
  const note = `📬 Pengguna ${fromPhone} mengirim pesan: "${msgText}". Silakan respon dari akun WA Business PST BPS.`
  for (const o of officers) { await sendAndLog(o.phone_number, note, env) }
}
async function enterAdminMode(replyTarget: string, contactPhone: string, meta: SessionMeta, templates: TemplateRow[], env?: RuntimeEnv): Promise<void> {
  meta.adminMode = true
  meta.level = null
  await upsertContact(contactPhone, meta)
  await sendAndLog(replyTarget, templateContent(templates, 'ADMIN_JAM'), env)
  await sendAndLog(replyTarget, templateContent(templates, 'ADMIN_END'), env)
}
async function handleBot(contactPhone: string, replyTarget: string, text: string, env?: RuntimeEnv): Promise<void> {
  const client = getWagateClient()
  const [contact, templates] = await Promise.all([
    client.selectOne<ContactRow>('contacts_wagate', { filter: { phone_number: `eq.${contactPhone}` } }),
    client.select<TemplateRow>('wa_templates_wagate'),
  ])
  const meta = metaOf(contact)
  const cmd = text.trim().toLowerCase()

  // 1. Admin mode — pass through until '00'
  if (meta.adminMode) {
    if (cmd === '00') {
      meta.adminMode = false; meta.level = null
      await upsertContact(contactPhone, meta)
      await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU_NEXT'), env)
    }
    return
  }

  // 2. Welcome once (first ever message — skip if 'menu' keyword so user goes straight to menu)
  if (!meta.lastWelcomeAt && cmd !== 'menu') {
    meta.lastWelcomeAt = new Date().toISOString()
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'WELCOME_MESSAGE'), env)
    return
  }

  // 3. Global '99' — back to main menu, clear state
  if (cmd === '99') {
    meta.level = null; meta.menuActive = false
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env)
    return
  }

  // 4. 'menu' keyword — activate menu
  if (cmd === 'menu') {
    meta.menuActive = true; meta.level = null
    await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env)
    return
  }

  // 5. Not in menu — notify admins once per 24h, ignore
  if (!meta.menuActive) {
    if (shouldNotifyAdmin(contactPhone)) {
      recordAdminNotify(contactPhone)
      await notifyAdmins(contactPhone, text, env)
    }
    return
  }

  // 6. In menu — route by level
  if (!meta.level) {
    // Top-level menu
    switch (cmd) {
      case '1': // Lokasi & Jadwal
        await sendLocationTextSequence(replyTarget, templates, env)
        break
      case '2': // Perpustakaan
        meta.level = '2'; await upsertContact(contactPhone, meta)
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'SUB_MENU_PERPUSTAKAAN'], env)
        break
      case '3': // Rekomendasi Statistik
        meta.level = '3'; await upsertContact(contactPhone, meta)
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'SUB_MENU_REKOMENDASI'], env)
        break
      case '4': // Konsultasi Statistik
        meta.level = '4'; await upsertContact(contactPhone, meta)
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'SUB_MENU_KONSULTASI'], env)
        break
      case '5': // Statistik Umum
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'STATISTIK_UMUM', 'WEB_BUSEL', 'THANKS', 'MAIN_MENU_NEXT'], env)
        break
      case '6': // Publikasi DDA
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'PUBLIKASI'], env)
        await sendAndLog(replyTarget, 'Kabupaten Buton Selatan Dalam Angka 2025.pdf', env)
        await sendTemplateSequence(replyTarget, templates, ['WEB_BUSEL', 'THANKS', 'MAIN_MENU_NEXT'], env)
        break
      case '7': // Publikasi KCDA
        meta.level = '7'; await upsertContact(contactPhone, meta)
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'SUB_MENU_PUBLIKASI_KCDA'], env)
        break
      case '8': // Chat Admin
        await enterAdminMode(replyTarget, contactPhone, meta, templates, env)
        break
      default:
        await sendTemplateSequence(replyTarget, templates, ['WAITING', 'MAIN_MENU'], env)
    }
    return
  }

  // 7. Sub-menu level routing
  if (cmd === '99') {
    meta.level = null; await upsertContact(contactPhone, meta)
    await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env)
    return
  }
  const level = meta.level
  if (level === '2') { await sendPerpustakaanMenuItem(replyTarget, templates, cmd, env); return }
  if (level === '3') {
    const result = await sendRecommendationMenuItem(replyTarget, templates, cmd, env)
    if (result === 'admin') { await enterAdminMode(replyTarget, contactPhone, meta, templates, env) }
    return
  }
  if (level === '4') {
    const result = await sendConsultationMenuItem(replyTarget, templates, cmd, env)
    if (result === 'admin') { await enterAdminMode(replyTarget, contactPhone, meta, templates, env) }
    return
  }
  if (level === '7') { await sendKcdaMenuItem(replyTarget, templates, cmd, env); return }
  if (level === '8') { await sendLocationSubMenuItem(replyTarget, templates, cmd, env); return }
  // Unknown level — reset
  meta.level = null; await upsertContact(contactPhone, meta)
  await sendAndLog(replyTarget, templateContent(templates, 'MAIN_MENU'), env)
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
