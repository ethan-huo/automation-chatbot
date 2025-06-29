import { env } from '@/lib/env'
import { GoogleGenAI } from '@google/genai'
import { inspect } from 'util'

import { VertexModel } from './models'

const genai = new GoogleGenAI({
  vertexai: true,
  project: env.GOOGLE_CLOUD_PROJECT_ID,
  location: env.GOOGLE_CLOUD_LOCALTION,
})

let operation = await genai.models.generateVideos({
  model: VertexModel.VEO_3_0_GENERATE_PREVIEW,
  prompt:
    'A mystical forest at golden hour with ethereal light rays piercing through ancient oak trees, mist swirling around moss-covered roots, a lone deer gracefully stepping through the undergrowth, cinematic wide shot with shallow depth of field, warm amber and emerald color palette, gentle camera push-in movement',
  // image: {},
  // video: {},
  config: {},
})

while (!operation.done) {
  await new Promise((resolve) => setTimeout(resolve, 10000))
  operation = await genai.operations.getVideosOperation({
    operation: operation,
  })
}

console.log(
  inspect(operation.response, {
    depth: null,
  }),
)
