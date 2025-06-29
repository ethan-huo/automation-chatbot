import { type } from 'arktype'

export const Veo3InputSchema = type({
  prompt: 'string',
  aspect_ratio: "'16:9' | '9:16' | '1:1' = '16:9'",
  duration: "'8s' = '8s'",
  'negative_prompt?': 'string',
  enhance_prompt: 'boolean = true',
  'seed?': 'number.integer',
  generate_audio: 'boolean = true',
})

export type Veo3Input = typeof Veo3InputSchema.inferIn

export const Veo3OutputSchema = type({
  video: { url: 'string.url' },
})

export type Veo3Output = typeof Veo3OutputSchema.inferOut
