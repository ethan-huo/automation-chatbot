import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

export * as t from './schema'

let _db:
  | (NeonHttpDatabase<Record<string, never>> & {
      $client: NeonQueryFunction<false, false>
    })
  | null = null

export const getDatabase = () => {
  if (!_db) {
    const client = neon(process.env.POSTGRES_URL)
    _db = drizzle(client)
  }
  return _db
}
