import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const keyLength = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    throw new Error('Bcrypt hashes require installing a bcrypt-compatible package')
  }

  const [algorithm, salt, hash] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !hash) {
    return password === storedHash
  }

  const storedKey = Buffer.from(hash, 'hex')
  const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey)
}
