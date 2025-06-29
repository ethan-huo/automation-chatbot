import { type } from 'arktype'
import { switchMap } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'



const clipdropOutputSchema = type({
  success: 'boolean',
  'data?': 'string',
  'error?': 'string',
})

export type CleanupInput = {
  imageFile: File
  maskFile: File
  mode: string
}

export type UpscaleInput = {
  imageFile: File
  targetWidth: string
  targetHeight: string
}

export type ClipDropOutput = typeof clipdropOutputSchema.infer

export type ClipDropContext = {
  apiKey: string
}

const baseUrl = 'https://api.302.ai/clipdrop'

function parseTextResponse<T>(
  response: Response,
  schema: { assert: (data: unknown) => T },
  transform: (text: string) => unknown,
) {
  return async (): Promise<T> => {
    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      )
    }
    const text = await response.text()
    return schema.assert(transform(text))
  }
}

export function cleanupImage(
  input: CleanupInput,
  context: ClipDropContext,
) {
  const formData = new FormData()
  formData.append('image_file', input.imageFile, input.imageFile.name)
  formData.append('mask_file', input.maskFile, input.maskFile.name)
  formData.append('mode', input.mode)

  return fromFetch(`${baseUrl}/cleanup/v1`, {
    method: 'POST',
    headers: {
      'x-api-key': context.apiKey,
    },
    body: formData,
  }).pipe(
    switchMap((response) =>
      parseTextResponse(
        response,
        clipdropOutputSchema,
        (text) => ({ success: true, data: text }),
      )(),
    ),
  )
}

export function upscaleImage(
  input: UpscaleInput,
  context: ClipDropContext,
) {
  const formData = new FormData()
  formData.append('image_file', input.imageFile, input.imageFile.name)
  formData.append('target_width', input.targetWidth)
  formData.append('target_height', input.targetHeight)

  return fromFetch(`${baseUrl}/image-upscaling/v1/upscale`, {
    method: 'POST',
    headers: {
      'x-api-key': context.apiKey,
    },
    body: formData,
  }).pipe(
    switchMap((response) =>
      parseTextResponse(
        response,
        clipdropOutputSchema,
        (text) => ({ success: true, data: text }),
      )(),
    ),
  )
}
