import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { sessions_wagate } from '../../db/schema'
import { verifyJwt  } from '../../lib/jwt'
import type {VerifiedJwt} from '../../lib/jwt';

export interface AuthUser {
  id: string
  username?: string
  sessionId: string
  roles: string[]
}

export type ApiVariables = {
  user: AuthUser
  token: string
}

export type ApiContext = Context<{ Variables: ApiVariables }>

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim()
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

  const [session] = await db
    .select()
    .from(sessions_wagate)
    .where(eq(sessions_wagate.id, payload.sessionId))
    .limit(1)

  if (!session || session.token !== token || session.expiresAt.getTime() <= Date.now()) {
    return c.json({ error: 'Session expired' }, 401)
  }

  c.set('token', token)
  c.set('user', { id: payload.sub, username: payload.username, sessionId: payload.sessionId, roles: payload.roles })
  await next()
}
