import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Database Induk (READ-ONLY) - untuk user authentication
const dbIndukClient = postgres(process.env.DATABASE_INDUK_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const dbInduk = drizzle(dbIndukClient)

// Database Baru - untuk semua tabel _wagate
const dbClient = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(dbClient)

// Export clients for cleanup
export { dbIndukClient, dbClient }
