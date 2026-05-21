import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
})

async function runMigration() {
  try {
    console.log('🔄 Running migration...')
    
    const migrationSQL = readFileSync(
      join(process.cwd(), 'drizzle/0000_cooing_ironclad.sql'),
      'utf-8'
    )
    
    const indexesSQL = readFileSync(
      join(process.cwd(), 'drizzle/indexes.sql'),
      'utf-8'
    )
    
    // Execute main migration
    await sql.unsafe(migrationSQL)
    console.log('✅ Tables created')
    
    // Execute indexes
    await sql.unsafe(indexesSQL)
    console.log('✅ Indexes created')
    
    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
