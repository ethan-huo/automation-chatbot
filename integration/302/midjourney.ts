import type { Observable } from 'rxjs'
import { firstValueFrom, mergeMap, switchMap, takeWhile, timer } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

// 松散的 TypeScript 类型定义，不进行严格验证
export type MidjourneyOutput = {
  code?: number
  description?: string
  properties?: Record<string, unknown>
  result?: string
  [key: string]: any // 允许其他字段
}

export type ImagineInput = {
  base64Array?: string[]
  botType: 'MID_JOURNEY' | 'NIJI_JOURNEY'
  notifyHook?: string
  prompt: string
  state?: string
}

export type ActionInput = {
  customId: string
  taskId: string
  notifyHook?: string
  state?: string
}

export type BlendInput = {
  base64Array: string[]
  botType: string
  dimensions?: string
  notifyHook?: string
  state?: string
}

export type DescribeInput = {
  base64: string
  botType: string
  notifyHook?: string
  state?: string
}

export type ModalInput = {
  maskBase64: string
  prompt: string
  taskId: string
}

export type TaskInput = {
  taskId: string
}

export type MidjourneyContext = {
  apiSecret: string
}

const baseUrl = 'https://api.302.ai/mj'

// 简单的 JSON 解析函数，不进行严格验证
function parseJsonResponse() {
  return async (response: Response) => {
    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      )
    }
    const data = await response.json()
    console.log('🔍 [Midjourney] API Response:', JSON.stringify(data, null, 2))
    return data
  }
}

export function action(input: ActionInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/submit/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mj-api-secret': context.apiSecret,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse()))
}

export function blend(input: BlendInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/submit/blend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mj-api-secret': context.apiSecret,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse()))
}

export function describe(input: DescribeInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/submit/describe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mj-api-secret': context.apiSecret,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse()))
}

export function modal(input: ModalInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/submit/modal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mj-api-secret': context.apiSecret,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse()))
}

export function fetchTask<T>(input: TaskInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/task/${input.taskId}/fetch`, {
    method: 'GET',
    headers: {
      'mj-api-secret': context.apiSecret,
    },
  }).pipe(
    switchMap(async (response) => {
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        )
      }
      const data = await response.json()
      return data as T
    }),
  )
}

export function cancelTask(input: TaskInput, context: MidjourneyContext) {
  return fromFetch(`${baseUrl}/task/${input.taskId}/cancel`, {
    method: 'POST',
    headers: {
      'mj-api-secret': context.apiSecret,
    },
  }).pipe(switchMap(parseJsonResponse()))
}

export function imagine(
  input: ImagineInput,
  context: MidjourneyContext,
): Observable<MidjourneyOutput> {
  return fromFetch(`${baseUrl}/submit/imagine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mj-api-secret': context.apiSecret,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse()))
}

// 松散的 TypeScript 类型定义，不进行严格验证
export type WatchTaskOutput = {
  action?: string
  botType?: string
  customId?: string
  description?: string
  failReason?: string
  finishTime?: number
  id?: string
  imageHeight?: number
  imageUrl?: string
  imageWidth?: number
  maskBase64?: string
  mode?: string
  progress?: string
  prompt?: string
  promptEn?: string
  proxy?: string
  startTime?: number
  state?: string
  status?:
    | 'NOT_START'
    | 'SUBMITTED'
    | 'MODAL'
    | 'IN_PROGRESS'
    | 'FAILURE'
    | 'SUCCESS'
    | 'CANCEL'
  submitTime?: number
  [key: string]: any // 允许其他字段
}

export function watch(
  opts: {
    taskId: string
    interval?: number
  },
  context: MidjourneyContext,
) {
  const input: TaskInput = { taskId: opts.taskId }

  return timer(0, opts.interval ?? 3000).pipe(
    mergeMap(async () => {
      const src$ = fetchTask<WatchTaskOutput>(input, context)
      const data = await firstValueFrom(src$)
      console.log(
        '🔍 [Midjourney] Watch Task Response:',
        JSON.stringify(data, null, 2),
      )
      return data as WatchTaskOutput
    }),

    takeWhile((it) => {
      console.log(`🔍 [Midjourney] Current status: "${it.status}"`)
      // 继续轮询直到任务完成（SUCCESS）或失败（FAILURE）
      return it.status !== 'SUCCESS' && it.status !== 'FAILURE'
    }, true),
  )
}
