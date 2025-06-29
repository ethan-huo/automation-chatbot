import { env } from '@/lib/env'
import { fal } from '@fal-ai/client'

fal.config({
  credentials: env.FAL_API_KEY,
})

// docs: https://fal.ai/models/fal-ai/flux-pro/kontext/text-to-image/api

export { fal }
