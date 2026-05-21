import { jwtVerify, SignJWT } from 'jose'

const encoder = new TextEncoder()
const defaultTtlSeconds = 60 * 60

export interface JwtPayload {
  sub: string
  sessionId: string
  username?: string
  roles: string[]
}

export interface VerifiedJwt extends JwtPayload {
  exp?: number
  iat?: number
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return encoder.encode(secret)
}

export async function signJwt(payload: JwtPayload, ttlSeconds = defaultTtlSeconds): Promise<string> {
  return new SignJWT({ roles: payload.roles, username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(payload.sessionId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getJwtSecret())
}

export async function verifyJwt(token: string): Promise<VerifiedJwt> {
  const result = await jwtVerify(token, getJwtSecret())
  const sub = result.payload.sub
  const sessionId = result.payload.jti
  const roles = result.payload.roles

  if (!sub || !sessionId || !Array.isArray(roles) || !roles.every((role) => typeof role === 'string')) {
    throw new Error('Invalid token payload')
  }

  return {
    sub,
    sessionId,
    roles,
    username: typeof result.payload.username === 'string' ? result.payload.username : undefined,
    exp: result.payload.exp,
    iat: result.payload.iat,
  }
}

export function getTokenExpiry(ttlSeconds = defaultTtlSeconds): Date {
  return new Date(Date.now() + ttlSeconds * 1000)
}
