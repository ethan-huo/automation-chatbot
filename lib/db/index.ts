import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export * as t from './schema'

let _db:
  | (PostgresJsDatabase<Record<string, never>> & {
      $client: postgres.Sql<{}>
    })
  | null = null

export const getDatabase = () => {
  if (!_db) {
    console.log('🔍 Getting database instance...')
    console.log('🔍 POSTGRES_URL:', process.env.POSTGRES_URL.slice(0, 30) + '...')
    const client = postgres(process.env.POSTGRES_URL)

    _db = drizzle(client)
  }
  return _db
}
