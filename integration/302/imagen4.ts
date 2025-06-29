import { type } from 'arktype'
import { switchMap } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

import { parseJsonResponse } from '../internal/utils'

const imageResultSchema = type({
  url: 'string',
  content_type: 'string',
  file_size: 'number',
  width: 'number',
  height: 'number',
})

const imagen4OutputSchema = type({
  images: imageResultSchema.array(),
  seed: 'number',
  'has_nsfw_concepts?': 'boolean | null',
  'debug_latents?': 'unknown',
  'debug_per_pass_latents?': 'unknown',
})

export type GenerateImageInput = {
  prompt: string
  aspectRatio: string
}

export type ImageResult = typeof imageResultSchema.infer
export type Imagen4Output = typeof imagen4OutputSchema.infer

export type Imagen4Context = {
  token: string
}

const baseUrl = 'https://api.302.ai/302/submit'

export function generateImage(
  input: GenerateImageInput,
  context: Imagen4Context,
) {
  const body = {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
  }

  return fromFetch(`${baseUrl}/imagen-4-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.token}`,
    },
    body: JSON.stringify(body),
  }).pipe(switchMap(parseJsonResponse(imagen4OutputSchema)))
}
