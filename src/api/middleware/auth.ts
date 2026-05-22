import type { Context, Next } from 'hono'
import { verifyJwt } from '../../lib/jwt'
import type { VerifiedJwt } from '../../lib/jwt'
import { getWagateClient } from '../../lib/supabase-rest'

export interface UserContext {
  id: string
  username: string
  sessionId: string
  roles: string[]
}

export type ApiContext = Context<{
  Variables: {
    user: UserContext
    token: string
  }
}>

function bearerToken(header: string | undefined): string | null {
  if (!header) return null
  const parts = header.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1] || null
}

export async function authMiddleware(c: ApiContext, next: Next): Promise<Response | void> {
  const token = bearerToken(c.req.header('Authorization'))
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  let payload: VerifiedJwt
  try {
    payload = await verifyJwt(token)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  try {
    // Per-request REST client — no I/O singleton issues on CF Workers
    const rest = getWagateClient()
    const session = await rest.selectOne<{ user_id: string; expires_at: string }>(
      'sessions_wagate',
      { filter: { token: `eq.${token}` } }
    )

    if (!session) return c.json({ error: 'Session not found' }, 401)
    if (session.user_id !== payload.sub) return c.json({ error: 'Token mismatch' }, 401)

    const expiresAt = new Date(session.expires_at)
    if (expiresAt.getTime() <= Date.now()) return c.json({ error: 'Session expired' }, 401)

    c.set('token', token)
    c.set('user', {
      id: payload.sub,
      username: payload.username ?? '',
      sessionId: payload.sessionId ?? '',
      roles: payload.roles ?? [],
    })
    await next()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Auth middleware error:', msg)
    return c.json({ error: 'Auth error', detail: msg }, 500)
  }
}
