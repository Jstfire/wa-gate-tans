import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient } from '../../lib/supabase-rest'

interface WaAccount {
  id: string
  phone_number: string | null
  name: string | null
  status: string
  last_connected_at: string | null
  created_at: string
  updated_at: string | null
}

const waAccounts = new Hono()

waAccounts.use('*', authMiddleware)

waAccounts.get('/', requirePermission('wa_connect'), async (c) => {
  try {
    const client = getWagateClient()
    const rows = await client.select<WaAccount>('wa_accounts_wagate', { order: 'created_at.desc' })
    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch WA accounts' }, 500)
  }
})

waAccounts.get('/status', requirePermission('wa_connect'), async (c) => {
  try {
    const client = getWagateClient()
    const account = await client.selectOne<WaAccount>('wa_accounts_wagate', { order: 'created_at.asc' })
    if (!account) return c.json({ error: 'No WA account configured' }, 404)
    return c.json(account)
  } catch {
    return c.json({ error: 'Failed to fetch WA status' }, 500)
  }
})

waAccounts.post('/connect', requirePermission('wa_connect'), async (c) => {
  try {
    const client = getWagateClient()
    const account = await client.selectOne<WaAccount>('wa_accounts_wagate', { order: 'created_at.asc' })

    if (!account) {
      const [created] = await client.insert<WaAccount>('wa_accounts_wagate', { status: 'connecting' })
      return c.json(created)
    }

    const [updated] = await client.update<WaAccount>('wa_accounts_wagate', {
      status: 'connecting',
      updated_at: new Date().toISOString(),
    }, { id: `eq.${account.id}` })

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to initiate WA connection' }, 500)
  }
})

waAccounts.post('/disconnect', requirePermission('wa_connect'), async (c) => {
  try {
    const client = getWagateClient()
    const account = await client.selectOne<WaAccount>('wa_accounts_wagate', { order: 'created_at.asc' })
    if (!account) return c.json({ error: 'No WA account configured' }, 404)

    const [updated] = await client.update<WaAccount>('wa_accounts_wagate', {
      status: 'disconnected',
      updated_at: new Date().toISOString(),
    }, { id: `eq.${account.id}` })

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to disconnect WA' }, 500)
  }
})

export default waAccounts
