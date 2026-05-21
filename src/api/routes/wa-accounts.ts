import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { wa_accounts_wagate } from '../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

const waAccounts = new Hono()

waAccounts.use('*', authMiddleware)

// GET /wa/status — get current WA account status
waAccounts.get('/status', requirePermission('wa_connect'), async (c) => {
  try {
    const [account] = await db.select({
      id: wa_accounts_wagate.id,
      phoneNumber: wa_accounts_wagate.phoneNumber,
      name: wa_accounts_wagate.name,
      status: wa_accounts_wagate.status,
      lastConnectedAt: wa_accounts_wagate.lastConnectedAt,
      createdAt: wa_accounts_wagate.createdAt,
      updatedAt: wa_accounts_wagate.updatedAt,
    }).from(wa_accounts_wagate).limit(1)

    if (!account) return c.json({ error: 'No WA account configured' }, 404)

    return c.json(account)
  } catch {
    return c.json({ error: 'Failed to fetch WA status' }, 500)
  }
})

// POST /wa/connect — trigger WA connection
waAccounts.post('/connect', requirePermission('wa_connect'), async (c) => {
  try {
    const [account] = await db.select().from(wa_accounts_wagate).limit(1)

    if (!account) {
      // Create a new account entry
      const [created] = await db.insert(wa_accounts_wagate).values({
        status: 'connecting',
      }).returning()
      return c.json(created)
    }

    const [updated] = await db.update(wa_accounts_wagate)
      .set({ status: 'connecting', updatedAt: new Date() })
      .where(eq(wa_accounts_wagate.id, account.id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to initiate WA connection' }, 500)
  }
})

// POST /wa/disconnect — trigger WA disconnect
waAccounts.post('/disconnect', requirePermission('wa_connect'), async (c) => {
  try {
    const [account] = await db.select().from(wa_accounts_wagate).limit(1)

    if (!account) return c.json({ error: 'No WA account configured' }, 404)

    const [updated] = await db.update(wa_accounts_wagate)
      .set({ status: 'disconnected', qrCode: null, updatedAt: new Date() })
      .where(eq(wa_accounts_wagate.id, account.id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to disconnect WA' }, 500)
  }
})

// GET /wa/qr — get current QR code
waAccounts.get('/qr', requirePermission('wa_connect'), async (c) => {
  try {
    const [account] = await db.select({
      id: wa_accounts_wagate.id,
      status: wa_accounts_wagate.status,
      qrCode: wa_accounts_wagate.qrCode,
    }).from(wa_accounts_wagate).limit(1)

    if (!account) return c.json({ error: 'No WA account configured' }, 404)

    if (account.status !== 'connecting' || !account.qrCode) {
      return c.json({ error: 'QR code not available', status: account.status }, 400)
    }

    return c.json({ qrCode: account.qrCode, status: account.status })
  } catch {
    return c.json({ error: 'Failed to fetch QR code' }, 500)
  }
})

export default waAccounts
