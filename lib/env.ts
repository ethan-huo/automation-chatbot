import { type } from 'arktype'

export const publicEnvSchema = type({
  NEXT_PUBLIC_MASTRA_BASE_URL: 'string.url',
})

export const privateEnvSchema = type({
  // ----------------------------------
  // Auth
  // ----------------------------------
  AUTH_SECRET: 'string',

  // ----------------------------------
  // AI APIs
  // ----------------------------------
  X_302_API_KEY: 'string',

  MINIMAX_API_KEY: 'string',
  MINIMAX_GROUP_ID: 'string',

  FAL_API_KEY: 'string',

  OPENROUTER_API_KEY: 'string',

  // ----------------------------------
  // Databases
  // ----------------------------------
  POSTGRES_URL: 'string.url',
  REDIS_URL: 'string.url',

  // ----------------------------------
  // Speed Painter
  // ----------------------------------
  SPEED_PAINTER_API_KEY: 'string',

  // ----------------------------------
  // File Storage (Cloudflare R2)
  // ----------------------------------
  CLOUDFLARE_ACCOUNT_ID: 'string',
  CLOUDFLARE_ACCESS_KEY_ID: 'string',
  CLOUDFLARE_SECRET_KEY: 'string',
  CLOUDFLARE_R2_BUCKET_NAME: 'string = "dev"',
  CLOUDFLARE_R2_PUBLIC_DEV_URL: 'string.url',

  // ----------------------------------
  // Optional: Vercel Blob (for compatibility)
  // ----------------------------------
  'BLOB_READ_WRITE_TOKEN?': 'string',
})

export const env = privateEnvSchema.assert(process.env)

export type PublicEnv = typeof publicEnvSchema.infer

export type Env = typeof privateEnvSchema.infer

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env, PublicEnv {}
  }
}
