import { Hono } from 'hono'
import { getWagateClient, getIndukClient } from '../../lib/supabase-rest'
import { signJwt, getTokenExpiry } from '../../lib/jwt'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'

const auth = new Hono()

interface LoginRequest {
  username: string
  password: string
}

interface LocalAdminRow { id: string; username: string; password_hash: string; display_name: string | null; role: string; is_active: boolean }

async function tryLocalAdminLogin(username: string, password: string): Promise<{ id: string; username: string; displayName: string | null; role: string } | null> {
  try {
    const wagate = getWagateClient()
    // Use Supabase REST RPC to verify bcrypt hash via pgcrypto crypt()
    const rows = await wagate.select<LocalAdminRow>('local_admins_wagate', {
      filter: { username: `eq.${username}`, is_active: 'eq.true' },
      limit: 1,
    })
    const admin = rows[0]
    if (!admin) return null
    // Verify via pgcrypto: SELECT (password_hash = crypt(input, password_hash))
    const url = process.env.SUPABASE_URL ?? ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const res = await fetch(`${url}/rest/v1/rpc/verify_local_admin_password`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ p_username: username, p_password: password }),
    })
    if (!res.ok) return null
    const result = await res.json() as { success: boolean }
    if (!result.success) return null
    return { id: admin.id, username: admin.username, displayName: admin.display_name, role: admin.role }
  } catch {
    return null
  }
}

auth.post('/login', async (c) => {
  let body: LoginRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request body' }, 400)
  }

  const { username, password } = body
  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400)
  }

  try {
    const wagate = getWagateClient()
    let userId: string
    let userUsername: string
    let namaPegawai: string | null = null
    let roleNames: string[] = []

    // 1. Try local admin table first (fallback for superadmin / test users)
    const localAdmin = await tryLocalAdminLogin(username, password)
    if (localAdmin) {
      userId = localAdmin.id
      userUsername = localAdmin.username
      namaPegawai = localAdmin.displayName
      roleNames = [localAdmin.role]
    } else {
      // 2. Try DB Induk RPC
      const induk = getIndukClient()
      const verifyResult = await induk.rpc<{ success: boolean; id?: number; username?: string; error?: string }>('verify_user_password', {
        args: { p_username: username, p_password: password },
      })

      if (!verifyResult?.success) {
        return c.json({ error: 'Invalid credentials' }, 401)
      }

      userId = String(verifyResult.id)
      userUsername = verifyResult.username ?? username

      // Get nama_pegawai (non-critical)
      try {
        const indukClient = getIndukClient()
        const pegRows = await indukClient.select<{ mst_pegawai?: { nama_pegawai?: string } }>(
          'akun_pengguna',
          { select: 'pegawai_id,mst_pegawai(nama_pegawai)', filter: { id: `eq.${verifyResult.id}` }, limit: 1 }
        )
        namaPegawai = pegRows[0]?.mst_pegawai?.nama_pegawai ?? null
      } catch { /* non-critical */ }

      // Get roles from wagate DB
      try {
        const userRoles = await wagate.select<{ roles_wagate: { name: string } }>(
          'user_roles_wagate',
          { select: 'roles_wagate(name)', filter: { user_id: `eq.${userId}` } }
        )
        roleNames = userRoles.map((r) => r.roles_wagate?.name).filter((n): n is string => Boolean(n))
      } catch { roleNames = [] }
    }

    const ttlSeconds = 60 * 60 * 8
    const expiresAt = getTokenExpiry(ttlSeconds)
    const sessionId = crypto.randomUUID()

    const token = await signJwt(
      { sub: userId, sessionId, username: userUsername, roles: roleNames },
      ttlSeconds
    )

    await wagate.insert('sessions_wagate', {
      id: sessionId,
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    })

    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: userId, username: userUsername, name: namaPegawai },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Login error:', msg)
    return c.json({ error: 'Authentication failed', detail: msg }, 500)
  }
})

auth.post('/logout', authMiddleware, async (c: ApiContext) => {
  try {
    const token = c.get('token')
    const wagate = getWagateClient()
    await wagate.delete('sessions_wagate', { token: `eq.${token}` })
    return c.json({ message: 'Logged out successfully' })
  } catch {
    return c.json({ message: 'Logged out' })
  }
})

auth.get('/me', authMiddleware, async (c: ApiContext) => {
  const user = c.get('user')
  return c.json({ id: user.id, username: user.username, roles: user.roles })
})

auth.post('/refresh', authMiddleware, async (c: ApiContext) => {
  try {
    const user = c.get('user')
    const oldToken = c.get('token')
    const wagate = getWagateClient()

    await wagate.delete('sessions_wagate', { token: `eq.${oldToken}` })

    const ttlSeconds = 60 * 60 * 8
    const expiresAt = getTokenExpiry(ttlSeconds)
    const sessionId = crypto.randomUUID()

    const token = await signJwt(
      { sub: user.id, sessionId, username: user.username, roles: user.roles },
      ttlSeconds
    )

    await wagate.insert('sessions_wagate', {
      id: sessionId,
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: user.id, username: user.username },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return c.json({ error: 'Refresh failed', detail: msg }, 500)
  }
})

export default auth
