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
    // Use DB Induk RPC for password verification.
    // Note: repeated rapid failed/successive calls may trigger DB-side password-check throttling; normal login flow is stable.
    const induk = getIndukClient()
    const verifyResult = await induk.rpc<{ success: boolean; id?: number; username?: string; error?: string }>('verify_user_password', {
      args: { p_username: username, p_password: password },
    })

    if (!verifyResult?.success) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const userId = String(verifyResult.id)
    const userUsername = verifyResult.username ?? username

    // Get nama_pegawai (non-critical)
    let namaPegawai: string | null = null
    try {
      const pegRows = await induk.select<{ mst_pegawai?: { nama_pegawai?: string } }>(
        'akun_pengguna',
        {
          select: 'pegawai_id,mst_pegawai(nama_pegawai)',
          filter: { id: `eq.${verifyResult.id}` },
          limit: 1,
        }
      )
      namaPegawai = pegRows[0]?.mst_pegawai?.nama_pegawai ?? null
    } catch {
      // non-critical
    }

    // Get user roles from wagate DB
    const wagate = getWagateClient()
    let roleNames: string[] = []
    try {
      const userRoles = await wagate.select<{ roles_wagate: { name: string } }>(
        'user_roles_wagate',
        {
          select: 'roles_wagate(name)',
          filter: { user_id: `eq.${userId}` },
        }
      )
      roleNames = userRoles
        .map((r) => r.roles_wagate?.name)
        .filter((n): n is string => Boolean(n))
    } catch {
      roleNames = []
    }

    const ttlSeconds = 60 * 60 * 8
    const expiresAt = getTokenExpiry(ttlSeconds)
    const sessionId = crypto.randomUUID()

    const token = await signJwt(
      { sub: userId, sessionId, username: userUsername, roles: roleNames },
      ttlSeconds
    )

    // Save session via REST
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
