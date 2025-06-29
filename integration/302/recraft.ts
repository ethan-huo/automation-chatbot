import { type } from 'arktype'
import { switchMap } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

import { parseJsonResponse } from '../internal/utils'

const recraftOutputSchema = type({
  id: 'string',
  url: 'string',
  status: 'string',
})

export type RecraftInput = {
  file: File
  responseFormat: string
}

export type RecraftOutput = typeof recraftOutputSchema.infer

export type RecraftContext = {
  bearerToken: string
}

const baseUrl = 'https://api.302.ai/recraft'

export function vectorizeImage(input: RecraftInput, context: RecraftContext) {
  const formData = new FormData()
  formData.append('file', input.file, input.file.name)
  formData.append('response_format', input.responseFormat)

  return fromFetch(`${baseUrl}/v1/images/vectorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.bearerToken}`,
      Accept: 'application/json',
    },
    body: formData,
  }).pipe(switchMap(parseJsonResponse(recraftOutputSchema)))
}

export function removeBackground(input: RecraftInput, context: RecraftContext) {
  const formData = new FormData()
  formData.append('file', input.file, input.file.name)
  formData.append('response_format', input.responseFormat)

  return fromFetch(`${baseUrl}/v1/images/removeBackground`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.bearerToken}`,
      Accept: 'application/json',
    },
    body: formData,
  }).pipe(switchMap(parseJsonResponse(recraftOutputSchema)))
}

export function clarityUpscale(input: RecraftInput, context: RecraftContext) {
  const formData = new FormData()
  formData.append('file', input.file, input.file.name)
  formData.append('response_format', input.responseFormat)

  return fromFetch(`${baseUrl}/v1/images/clarityUpscale`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.bearerToken}`,
      Accept: 'application/json',
    },
    body: formData,
  }).pipe(switchMap(parseJsonResponse(recraftOutputSchema)))
}

export function generativeUpscale(
  input: RecraftInput,
  context: RecraftContext,
) {
  const formData = new FormData()
  formData.append('file', input.file, input.file.name)
  formData.append('response_format', input.responseFormat)

  return fromFetch(`${baseUrl}/v1/images/generativeUpscale`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.bearerToken}`,
      Accept: 'application/json',
    },
    body: formData,
  }).pipe(switchMap(parseJsonResponse(recraftOutputSchema)))
}
