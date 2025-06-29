import { type } from 'arktype'
import { switchMap } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

import { parseJsonResponse } from '../internal/utils'

const taskStateSchema = type({
  state: 'number',
  progress: 'number',
})

const taskStatusOutputSchema = type({
  status: 'number',
  message: 'string',
  data: 'Record<string, unknown>',
})

export type GenerateTermsInput = {
  videoSubject: string
  modelsName: string
  videoLanguage: string
}

export type GenerateScriptsInput = {
  videoSubject: string
  modelsName: string
  videoLanguage: string
}

export type GetTaskStatusInput = {
  taskId: string
}

export type TaskState = typeof taskStateSchema.infer
export type TaskStatusOutput = typeof taskStatusOutputSchema.infer

export type StockVideoContext = {
  token: string
}

const baseUrl = 'https://api.302.ai/302/stock-video/api/v1'

const termsOutputSchema = type('unknown')
const scriptsOutputSchema = type('unknown')

export function generateTerms(
  input: GenerateTermsInput,
  context: StockVideoContext,
) {
  const body = {
    video_subject: input.videoSubject,
    models_name: input.modelsName,
    video_language: input.videoLanguage,
  }

  return fromFetch(`${baseUrl}/terms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.token}`,
    },
    body: JSON.stringify(body),
  }).pipe(switchMap(parseJsonResponse(termsOutputSchema)))
}

export function generateScripts(
  input: GenerateScriptsInput,
  context: StockVideoContext,
) {
  const body = {
    video_subject: input.videoSubject,
    models_name: input.modelsName,
    video_language: input.videoLanguage,
  }

  return fromFetch(`${baseUrl}/scripts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.token}`,
    },
    body: JSON.stringify(body),
  }).pipe(switchMap(parseJsonResponse(scriptsOutputSchema)))
}

export function getTaskStatus(
  input: GetTaskStatusInput,
  context: StockVideoContext,
) {
  return fromFetch(`${baseUrl}/tasks/${input.taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${context.token}`,
    },
  }).pipe(switchMap(parseJsonResponse(taskStatusOutputSchema)))
}
