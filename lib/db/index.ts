import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

export * as t from './schema'
const client = neon(process.env.POSTGRES_URL!)
export const db = drizzle(client)
