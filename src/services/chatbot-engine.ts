import { eq, desc } from 'drizzle-orm'
import { Location, MessageMedia } from 'whatsapp-web.js'
import { db } from '../db/index'
import { chatbot_rules_wagate, officer_numbers_wagate  } from '../db/schema/wa'
import type {ChatbotRule} from '../db/schema/wa';
import { contacts_wagate, content_files_wagate } from '../db/schema/messages'
import { normalizePhoneNumber } from '../lib/phone'
import type { WaClientManager } from './wa-client'

type RawSendClient = {
  sendMessage: (to: string, content: string | Location | MessageMedia) => Promise<unknown>
}

const antiSpamCache = new Map<string, number>()
const ANTI_SPAM_MS = 30_000

function getAntiSpamKey(fromNumber: string, trigger: string): string {
  return `${normalizePhoneNumber(fromNumber)}:${trigger.toLowerCase()}`
}

function wasRecentlyProcessed(fromNumber: string, trigger: string): boolean {
  const key = getAntiSpamKey(fromNumber, trigger)
  const last = antiSpamCache.get(key)
  if (!last) return false
  return Date.now() - last < ANTI_SPAM_MS
}

function markProcessed(fromNumber: string, trigger: string): void {
  antiSpamCache.set(getAntiSpamKey(fromNumber, trigger), Date.now())
}

function matchRule(messageText: string, rules: ChatbotRule[]): ChatbotRule | null {
  const text = messageText.toLowerCase().trim()
  return (
    rules.find((rule) => {
      const trigger = rule.trigger.toLowerCase().trim()
      return text === trigger || text.includes(trigger)
    }) ?? null
  )
}

async function sendRawClientMessage(
  client: WaClientManager,
  to: string,
  content: Location | MessageMedia | string
): Promise<void> {
  if (typeof content === 'string') {
    await client.sendMessage(to, content)
    return
  }

  const rawClient = Reflect.get(client, 'client') as RawSendClient | null
  if (!rawClient) throw new Error('WA client is not ready')
  await rawClient.sendMessage(`${normalizePhoneNumber(to)}@c.us`, content)
}

async function sendPdfResponse(to: string, rule: ChatbotRule, client: WaClientManager): Promise<void> {
  const metadata = rule.responseMetadata
  const pdfId = metadata?.pdf_id
  if (!pdfId) {
    await client.sendMessage(to, rule.responseContent)
    return
  }

  const files = await db
    .select()
    .from(content_files_wagate)
    .where(eq(content_files_wagate.id, pdfId))
    .limit(1)

  const file = files[0]
  if (!file) {
    await client.sendMessage(to, rule.responseContent)
    return
  }

  const media = await MessageMedia.fromUrl(file.googleDriveUrl, {
    unsafeMime: true,
    filename: file.originalFilename,
  })
  await sendRawClientMessage(client, to, media)
}

async function sendLocationResponse(to: string, rule: ChatbotRule, client: WaClientManager): Promise<void> {
  const metadata = rule.responseMetadata
  const coords = metadata?.location_coords
  if (!coords) {
    await client.sendMessage(to, rule.responseContent)
    return
  }

  const location = new Location(coords.lat, coords.lng, { name: rule.responseContent })
  await sendRawClientMessage(client, to, location)
}

async function forwardToAdmins(fromNumber: string, messageText: string, client: WaClientManager): Promise<void> {
  const officers = await db
    .select()
    .from(officer_numbers_wagate)
    .where(eq(officer_numbers_wagate.isActive, true))

  const forwarded = `Pesan masuk dari ${normalizePhoneNumber(fromNumber)}:\n\n${messageText}`
  await Promise.all(
    officers.map(async (officer) => {
      await client.sendMessage(officer.phoneNumber, forwarded)
    })
  )
}

async function isKnownContact(fromNumber: string): Promise<boolean> {
  const contacts = await db
    .select()
    .from(contacts_wagate)
    .where(eq(contacts_wagate.phoneNumber, normalizePhoneNumber(fromNumber)))
    .orderBy(desc(contacts_wagate.updatedAt))
    .limit(1)

  return contacts.length > 0 && contacts[0].hasChatHistory
}

export async function processChatbotMessage(
  fromNumber: string,
  messageText: string,
  client: WaClientManager
): Promise<void> {
  const rules = await db
    .select()
    .from(chatbot_rules_wagate)
    .where(eq(chatbot_rules_wagate.isActive, true))
    .orderBy(chatbot_rules_wagate.order)

  const rule = matchRule(messageText, rules)

  if (!rule) {
    // Fallback: if known contact, intentionally do nothing; unknown senders ignored too.
    await isKnownContact(fromNumber)
    return
  }

  if (wasRecentlyProcessed(fromNumber, rule.trigger)) {
    console.log('[Chatbot] Anti-spam suppressed trigger:', rule.trigger, fromNumber)
    return
  }

  markProcessed(fromNumber, rule.trigger)

  switch (rule.responseType) {
    case 'text':
      await client.sendMessage(fromNumber, rule.responseContent)
      break
    case 'link': {
      const metadata = rule.responseMetadata
      const url = metadata?.link_url ? `\n${metadata.link_url}` : ''
      await client.sendMessage(fromNumber, `${rule.responseContent}${url}`)
      break
    }
    case 'location':
      await sendLocationResponse(fromNumber, rule, client)
      break
    case 'pdf':
      await sendPdfResponse(fromNumber, rule, client)
      break
    case 'admin':
      await forwardToAdmins(fromNumber, messageText, client)
      await client.sendMessage(fromNumber, rule.responseContent)
      break
    default:
      console.warn('[Chatbot] Unknown response type:', rule.responseType)
  }
}
