import {
  catchError,
  lastValueFrom,
  retry,
  switchMap,
  takeWhile,
  tap,
  timer,
} from 'rxjs'
import { fromFetch } from 'rxjs/fetch'
// @ts-ignore
import { parseTar } from 'tarparser'

export const MODELS = {
  SPEECH_02_HD: 'speech-02-hd',
  SPEECH_02_TURBO: 'speech-02-turbo',
}

export type VoiceSetting = {
  voice_id: string
  speed: number
  vol: number
  pitch: number
}

export type PronunciationDict = {
  tone: string[]
}

export type AudioSetting = {
  audio_sample_rate?: number
  bitrate?: number
  format?: string
  channel: number
}

export type GenerateAudioInput = {
  model: string
  text: string
  voice_setting: VoiceSetting
  pronunciation_dict?: PronunciationDict
  audio_setting?: AudioSetting
}

export type MinimaxAudioContext = {
  apiKey: string
}

// 根据实际返回结果修正类型声明
export type MinimaxAudioOutput = {
  task_id: number
  task_token: string
  file_id: number
  usage_characters: number
  base_resp: {
    status_code: number
    status_msg: string
  }
}

export type TaskStatusInput = {
  task_id: string | number
}

// 根据实际返回值修正类型声明
export type TaskStatusOutput = {
  status: string
  task_id: number
  file_id: number
  base_resp: {
    status_code: number
    status_msg: string
  }
}

export type DownloadFileInput = {
  file_id: string | number
}

export type AudioMetadata = {
  status_code: number
  err: string
  audio_length: number // 音频长度（毫秒）
  audio_sample_rate: number // 采样率
  audio_size: number // 文件大小
  bitrate: number // 比特率
  invalid_count: number
  word_count: number // 字数
  vol: number // 音量
  invisible_character_ratio: number
}

export type TimingInfo = {
  text: string
  time_begin: number // 开始时间（毫秒）
  time_end: number // 结束时间（毫秒）
  text_begin: number
  text_end: number
}

export type DownloadFileOutput = {
  audioBuffer: ArrayBuffer
  filename: string
  audioFormat: 'mp3' | 'wav' | 'unknown'
  sizeBytes: number
  // 新增元数据
  duration: number // 音频时长（秒）
  durationMs: number // 音频时长（毫秒）
  metadata: AudioMetadata // 完整的音频元数据
  timingInfo: TimingInfo[] // 时间轴信息
}

export type FileInfoResponse = {
  file: {
    file_id: number
    bytes: number
    created_at: number
    filename: string
    purpose: string
    download_url: string
  }
  base_resp: {
    status_code: number
    status_msg: string
  }
}

const baseUrl = 'https://api.302.ai/minimaxi/v1'

async function makeRequest<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

function createHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
}

export async function generateAudio(
  input: GenerateAudioInput,
  context: MinimaxAudioContext,
): Promise<MinimaxAudioOutput> {
  return makeRequest(`${baseUrl}/t2a_async_v2`, {
    method: 'POST',
    headers: createHeaders(context.apiKey),
    body: JSON.stringify(input),
  })
}

export async function queryTaskStatus(
  input: TaskStatusInput,
  context: MinimaxAudioContext,
): Promise<TaskStatusOutput> {
  return makeRequest(
    `${baseUrl}/query/t2a_async_query_v2?task_id=${input.task_id}`,
    {
      method: 'GET',
      headers: createHeaders(context.apiKey),
    },
  )
}

export async function downloadFile(
  input: DownloadFileInput,
  context: MinimaxAudioContext,
): Promise<DownloadFileOutput> {
  // 步骤 1: 获取文件信息和下载链接
  const fileInfoResponse = await makeRequest<FileInfoResponse>(
    `${baseUrl}/files/retrieve?file_id=${input.file_id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${context.apiKey}`,
      },
    },
  )

  if (fileInfoResponse.base_resp.status_code !== 0) {
    throw new Error(
      `File info request failed: ${fileInfoResponse.base_resp.status_msg}`,
    )
  }

  const downloadUrl = fileInfoResponse.file.download_url
  if (!downloadUrl) {
    throw new Error('No download URL found in response')
  }

  // 步骤 2: 从实际的下载链接下载文件
  const downloadResponse = await fetch(downloadUrl, {
    method: 'GET',
  })

  if (!downloadResponse.ok) {
    throw new Error(
      `Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`,
    )
  }

  const tarBuffer = await downloadResponse.arrayBuffer()

  // 使用 tarparser 解析 tar 文件（纯内存操作，serverless 友好）
  const tarFiles = await parseTar(tarBuffer)

  // 查找音频文件
  const audioFile = tarFiles.find(
    (file: any) => file.name.endsWith('.mp3') || file.name.endsWith('.wav'),
  )

  if (!audioFile) {
    throw new Error('No audio file found in tar archive')
  }

  // 查找元数据文件
  const extraFile = tarFiles.find((file: any) => file.name.endsWith('.extra'))
  const titlesFile = tarFiles.find((file: any) => file.name.endsWith('.titles'))

  // 解析元数据
  let metadata: AudioMetadata = {
    status_code: 0,
    err: '',
    audio_length: 0,
    audio_sample_rate: 0,
    audio_size: audioFile.size,
    bitrate: 0,
    invalid_count: 0,
    word_count: 0,
    vol: 1,
    invisible_character_ratio: 0,
  }

  let timingInfo: TimingInfo[] = []

  if (extraFile) {
    try {
      const extraText = new TextDecoder().decode(extraFile.data)
      metadata = JSON.parse(extraText)
    } catch (error) {
      console.warn('Failed to parse .extra metadata:', error)
    }
  }

  if (titlesFile) {
    try {
      const titlesText = new TextDecoder().decode(titlesFile.data)
      timingInfo = JSON.parse(titlesText)
    } catch (error) {
      console.warn('Failed to parse .titles metadata:', error)
    }
  }

  // 获取音频格式
  const audioFormat = audioFile.name.endsWith('.wav') ? 'wav' : 'mp3'

  // 计算时长（秒）
  const durationMs = metadata.audio_length || 0
  const duration = Math.round((durationMs / 1000) * 100) / 100 // 保留2位小数

  return {
    audioBuffer: audioFile.data.buffer.slice(
      audioFile.data.byteOffset,
      audioFile.data.byteOffset + audioFile.data.byteLength,
    ) as ArrayBuffer,
    filename: audioFile.name,
    audioFormat,
    sizeBytes: audioFile.size,
    // 新增元数据
    duration,
    durationMs,
    metadata,
    timingInfo,
  }
}

// 使用 RxJS 实现轮询查询任务状态直到完成
export function pollTaskStatus(
  taskId: string | number,
  options: {
    apiKey: string
    maxAttempts?: number
    intervalMs?: number
  },
) {
  const { intervalMs = 2000 } = options

  return timer(0, intervalMs).pipe(
    switchMap(() =>
      fromFetch(`${baseUrl}/query/t2a_async_query_v2?task_id=${taskId}`, {
        method: 'GET',
        headers: createHeaders(options.apiKey),
      }).pipe(
        switchMap((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.json()
        }),
        retry({
          count: 3,
          delay: 1000,
        }),
        catchError((error) => {
          console.warn('⚠️ Failed to query status, retrying...', error.message)
          throw error
        }),
      ),
    ),
    takeWhile((status: TaskStatusOutput) => {
      // 继续轮询直到任务完成或失败
      if (status.status === 'Success') {
        return false // 成功，停止轮询
      }
      if (status.status === 'Failed') {
        throw new Error(`Task failed: ${status.status}`)
      }
      return true // 继续轮询
    }, true), // includeLastValue: true，包含最后一个值
  )
}

// 组合函数：轮询任务状态并下载文件
export async function pollAndDownload(options: {
  taskId: string | number
  apiKey: string
  maxAttempts?: number
  intervalMs?: number
  onProgress?: (status: TaskStatusOutput) => void
  onDownloadStart?: () => void
}): Promise<DownloadFileOutput> {
  const { onDownloadStart, taskId, ...pollOptions } = options

  const finalStatus = await lastValueFrom(
    pollTaskStatus(taskId, pollOptions).pipe(
      tap((status) => {
        options.onProgress?.(status)
      }),
    ),
  )

  if (onDownloadStart) {
    onDownloadStart()
  }

  const downloadResult = await downloadFile(
    { file_id: finalStatus.file_id },
    { apiKey: options.apiKey },
  )

  return downloadResult
}
