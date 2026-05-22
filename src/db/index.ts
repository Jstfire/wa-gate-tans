import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// CF Workers: small pool + prepare:false for Supabase pooler compatibility
const poolConfig = {
  max: 2,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false,
} as const

// Database Induk (READ-ONLY) - direct connection (port 5432) for pgsodium support
const dbIndukClient = postgres(
  process.env.DATABASE_INDUK_DIRECT_URL || process.env.DATABASE_INDUK_URL!,
  poolConfig
)
export const dbInduk = drizzle(dbIndukClient)

// Database Baru - untuk semua tabel _wagate
const dbClient = postgres(process.env.DATABASE_URL!, poolConfig)
export const db = drizzle(dbClient)

export { dbIndukClient, dbClient }
