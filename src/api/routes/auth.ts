import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, dbIndukClient  } from '../../db'
import { sessions_wagate } from '../../db/schema'
import { signJwt, getTokenExpiry } from '../../lib/jwt'
import { verifyPassword } from '../../lib/password'
import { getUserRoles } from '../../lib/rbac'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';

const auth = new Hono()

interface UserRecord {
  id: string
  username?: string
  email?: string
  password: string
  nama?: string
  name?: string
  is_active?: boolean
}

interface LoginRequest {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  expiresAt: string
  user: {
    id: string
    username?: string
    name?: string
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

  let user: UserRecord | null = null
  try {
    const result = await dbIndukClient.unsafe(
      `SELECT id, username, email, password, nama, name, is_active 
       FROM users 
       WHERE (username = $1 OR email = $1) 
       LIMIT 1`,
      [username]
    )
    user = (result[0] as unknown as UserRecord | undefined) || null
  } catch (error) {
    console.error('Database query error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  if (user.is_active === false) {
    return c.json({ error: 'Account is inactive' }, 403)
  }

  let passwordValid = false
  try {
    passwordValid = await verifyPassword(password, user.password)
  } catch (error) {
    console.error('Password verification error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }

  if (!passwordValid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const roles = await getUserRoles(user.id)
  const ttlSeconds = 60 * 60 * 8
  const expiresAt = getTokenExpiry(ttlSeconds)

  const sessionId = crypto.randomUUID()
  const token = await signJwt(
    {
      sub: user.id,
      sessionId,
      username: user.username || user.email,
      roles: roles.map((r) => r.name),
    },
    ttlSeconds
  )

  await db.insert(sessions_wagate).values({
    id: sessionId,
    userId: user.id,
    token,
    expiresAt,
  })

  const response: LoginResponse = {
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username || user.email,
      name: user.nama || user.name,
    },
  }

  return c.json(response)
})

auth.post('/logout', authMiddleware, async (c: ApiContext) => {
  const user = c.get('user')
  await db.delete(sessions_wagate).where(eq(sessions_wagate.id, user.sessionId))
  return c.json({ message: 'Logged out successfully' })
})

auth.post('/refresh', authMiddleware, async (c: ApiContext) => {
  const user = c.get('user')
  const oldToken = c.get('token')

  await db.delete(sessions_wagate).where(eq(sessions_wagate.token, oldToken))

  const roles = await getUserRoles(user.id)
  const ttlSeconds = 60 * 60 * 8
  const expiresAt = getTokenExpiry(ttlSeconds)

  const sessionId = crypto.randomUUID()
  const token = await signJwt(
    {
      sub: user.id,
      sessionId,
      username: user.username,
      roles: roles.map((r) => r.name),
    },
    ttlSeconds
  )

  await db.insert(sessions_wagate).values({
    id: sessionId,
    userId: user.id,
    token,
    expiresAt,
  })

  const response: LoginResponse = {
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username,
    },
  }

  return c.json(response)
})

auth.get('/me', authMiddleware, async (c: ApiContext) => {
  const user = c.get('user')
  const roles = await getUserRoles(user.id)

  return c.json({
    id: user.id,
    username: user.username,
    roles: roles.map((r) => ({ name: r.name, permissions: r.permissions })),
  })
})

export default auth
