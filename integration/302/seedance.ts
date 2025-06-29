import { type } from 'arktype'
import { firstValueFrom, mergeMap, switchMap, takeWhile, timer } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

import { parseJsonResponse } from '../internal/utils'

const seedanceOutputSchema = type({
  id: 'string',
})

const seedanceResultSchema = type({
  id: 'string',
  model: 'string',
  status: 'string',
  content: {
    video_url: 'string',
  },
  usage: {
    completion_tokens: 'number',
  },
  created_at: 'number',
  updated_at: 'number',
})

// https://www.volcengine.com/docs/82379/1520757
const $ = type.scope({
  Model: `"doubao-seedance-1-0-lite-i2v-250428" | "doubao-seedance-1-0-pro-250528"`,
  TextCotnent: {
    type: '"text"',
    text: 'string',

    'resolution?': `'480p' | '720p' | '1080p'`,
    ratio: `"21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "9:21" | "keep_ratio" | "adaptive" = "adaptive"`,
    duration: 'number.integer = 5',
    'framepersecond?': '16 | 24',
    watermark: 'boolean=false',
    seed: 'number = -1',
    'camerafixed?': 'boolean',
  },
  ImageContent: {
    type: '"image_url"',
    // 图片URL：请确保图片URL可被访问。
    // Base64编码：请遵循此格式data:image/{图片格式};base64,{图片Base64编码}。
    // JPEG（JPG）、PNG、WEBP、BMP、TIFF、GIF
    // 宽高比（宽/高）：在范围 (0.4, 2.5)
    // 边长：（300，6000）px，即短边像素需大于 300 px，长边像素需小于6000 px。
    // 大小：小于10MB。
    image_url: {
      url: 'string',
    },

    // 当使用首尾帧图生视频功能时，需传入 2个 image_url 对象，1 个 role 为 first_frame，另一个 role 为 last_frame。传入的首尾帧图片可相同。
    // 首尾帧图片的宽高比不一致时，以首帧图片为主，尾帧图片会自动裁剪适配。
    // 当使用首帧图生视频功能时，role 填写 first_frame 或不填。
    'role?': '"first_frame" | "last_frame"',
  },
  Content: 'TextCotnent | ImageContent',

  // callback payload
  TaskResult: {
    id: 'string',
    model: 'string',
    status: `'queued' | 'running' | 'cancelled' | 'succeeded' | 'failed'`,
    error: 'object | null',
    created_at: 'number',
    updated_at: 'number',
    content: {
      video_url: 'string',
    },
    usage: {
      completion_tokens: 'number',
      total_tokens: 'number',
    },
  },

  Root: {
    model: 'Model',
    content: 'Content[]',
    'callback_url?': 'string.url',
  },
})

const types = $.export()

export type SeedanceInput = typeof types.Root.inferIn

export type SeedanceTaskInput = {
  taskId: string
}

export type SeedanceOutput = typeof seedanceOutputSchema.infer
export type SeedanceResult = typeof seedanceResultSchema.infer

export type SeedanceContext = {
  apiKey: string
}

const baseUrl = 'https://api.302.ai/doubao'

export function generateVideo(input: SeedanceInput, context: SeedanceContext) {
  return fromFetch(`${baseUrl}/doubao-seedance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.apiKey}`,
    },
    body: JSON.stringify(input),
  }).pipe(switchMap(parseJsonResponse(seedanceOutputSchema)))
}

export function fetchTask(input: SeedanceTaskInput, context: SeedanceContext) {
  return fromFetch(`${baseUrl}/doubao-seedance/${input.taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${context.apiKey}`,
      'Content-Type': 'application/json',
    },
  }).pipe(switchMap(parseJsonResponse(seedanceResultSchema)))
}

export function watch(
  opts: {
    taskId: string
    interval?: number
  },
  context: SeedanceContext,
) {
  const input: SeedanceTaskInput = { taskId: opts.taskId }

  return timer(0, opts.interval ?? 5000).pipe(
    mergeMap(async () => {
      const src$ = fetchTask(input, context)
      const data = await firstValueFrom(src$)
      return seedanceResultSchema.assert(data)
    }),

    takeWhile((it) => {
      return it.status !== 'succeeded' && it.status !== 'failed'
    }, true),
  )
}
