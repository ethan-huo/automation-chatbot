import { env } from '@/lib/env'

// 基于官方文档的完整音色列表 - 只保留确认可用的音色
export const DoubaoTTSVoices = {
  // 中文音色 - 基础可用音色
  zh_male_M392_conversation_wvae_bigtts: '中文男声-自然对话',
  zh_male_M001_conversation_wvae_bigtts: '中文男声-标准',
  zh_female_F001_conversation_wvae_bigtts: '中文女声-标准',

  // 其他音色可能需要额外授权，先注释掉
  // 'zh_female_F421_conversation_wvae_bigtts': '中文女声-自然对话',
  // 'zh_male_M101_conversation_wvae_bigtts': '中文男声-青年',
  // 'zh_female_F101_conversation_wvae_bigtts': '中文女声-青年',
  // 'zh_male_M201_conversation_wvae_bigtts': '中文男声-成熟',
  // 'zh_female_F201_conversation_wvae_bigtts': '中文女声-成熟',
  // 'zh_male_M301_conversation_wvae_bigtts': '中文男声-磁性',
  // 'zh_female_F301_conversation_wvae_bigtts': '中文女声-甜美',

  // 英文音色
  en_male_M001_conversation_wvae_bigtts: '英文男声-标准',
  en_female_F001_conversation_wvae_bigtts: '英文女声-标准',
  en_male_M101_conversation_wvae_bigtts: '英文男声-青年',
  en_female_F101_conversation_wvae_bigtts: '英文女声-青年',

  // 多语种音色
  multi_male_M001_conversation_wvae_bigtts: '多语种男声',
  multi_female_F001_conversation_wvae_bigtts: '多语种女声',
} as const

export type DoubaoTTSVoiceType = keyof typeof DoubaoTTSVoices

export type DoubaoTTSEncoding = 'wav' | 'pcm' | 'ogg_opus' | 'mp3'

export type DoubaoTTSLanguage =
  | 'zh'
  | 'en'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'ru'

export type DoubaoTTSRequest = {
  text: string
  voiceType?: DoubaoTTSVoiceType
  encoding?: DoubaoTTSEncoding
  speedRatio?: number
  volumeRatio?: number
  pitchRatio?: number
  language?: DoubaoTTSLanguage
  emotion?: string
  reqId?: string
  // SSML相关
  enableSSML?: boolean
  // 缓存相关
  useCache?: boolean
  textType?: number
}

export type DoubaoTTSResponse = {
  success: boolean
  audioBuffer?: ArrayBuffer
  error?: string
  reqId?: string
  duration?: number
  sequence?: number
}

export async function generateDoubaoTTS(
  request: DoubaoTTSRequest,
): Promise<DoubaoTTSResponse> {
  const {
    text,
    voiceType = 'zh_male_M392_conversation_wvae_bigtts',
    encoding = 'mp3',
    speedRatio = 1.0,
    volumeRatio = 1.0,
    pitchRatio = 1.0,
    language,
    emotion,
    reqId = `tts_${Date.now()}`,
    enableSSML = false,
    useCache = false,
    textType = 1,
  } = request

  // 参数验证
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'Text is required',
    }
  }

  if (text.length > 1024) {
    return {
      success: false,
      error: 'Text length exceeds 1024 bytes limit',
    }
  }

  if (speedRatio < 0.8 || speedRatio > 2.0) {
    return {
      success: false,
      error: 'Speed ratio must be between 0.8 and 2.0',
    }
  }

  if (volumeRatio < 0.1 || volumeRatio > 3.0) {
    return {
      success: false,
      error: 'Volume ratio must be between 0.1 and 3.0',
    }
  }

  if (pitchRatio < 0.8 || pitchRatio > 1.2) {
    return {
      success: false,
      error: 'Pitch ratio must be between 0.8 and 1.2',
    }
  }

  // 构建请求体
  const audioConfig: Record<string, any> = {
    voice_type: voiceType,
    encoding,
    speed_ratio: speedRatio,
    volume_ratio: volumeRatio,
    pitch_ratio: pitchRatio,
  }

  // 添加可选参数
  if (language) {
    audioConfig.language = language
  }
  if (emotion) {
    audioConfig.emotion = emotion
  }

  const requestConfig: Record<string, any> = {
    reqid: reqId,
    text: text.trim(),
    operation: 'query',
  }

  // SSML相关参数
  if (enableSSML) {
    requestConfig.text_type = 'ssml'
  }

  const requestBody = {
    audio: audioConfig,
    request: requestConfig,
  }

  // 缓存相关参数
  if (useCache) {
    requestBody.audio.use_cache = true
    requestBody.request.text_type = textType
  }

  try {
    const response = await fetch('https://api.302.ai/doubao/tts_hd', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.X_302_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        reqId,
      }
    }

    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      const jsonResponse = await response.json()

      // 检查错误码
      if (jsonResponse.code && jsonResponse.code !== 3000) {
        return {
          success: false,
          error: `API Error ${jsonResponse.code}: ${jsonResponse.message}`,
          reqId: jsonResponse.reqid || reqId,
        }
      }

      // 如果JSON中包含音频数据
      if (jsonResponse.data) {
        const audioData = jsonResponse.data
        if (typeof audioData === 'string') {
          // Base64编码的音频数据
          const buffer = Buffer.from(audioData, 'base64')
          return {
            success: true,
            audioBuffer: buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ),
            reqId: jsonResponse.reqid || reqId,
            duration: jsonResponse.addition?.duration
              ? parseInt(jsonResponse.addition.duration)
              : undefined,
            sequence: jsonResponse.sequence,
          }
        }
      }

      return {
        success: false,
        error: 'No audio data found in JSON response',
        reqId: jsonResponse.reqid || reqId,
      }
    } else if (contentType?.includes('audio/')) {
      // 直接返回音频流
      const audioBuffer = await response.arrayBuffer()
      return {
        success: true,
        audioBuffer,
        reqId,
      }
    } else {
      const textResponse = await response.text()
      return {
        success: false,
        error: `Unexpected response format: ${textResponse.substring(0, 200)}`,
        reqId,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      reqId,
    }
  }
}

// 批量生成TTS
export async function generateBatchDoubaoTTS(
  requests: DoubaoTTSRequest[],
): Promise<DoubaoTTSResponse[]> {
  const results = await Promise.allSettled(
    requests.map((request) => generateDoubaoTTS(request)),
  )

  return results.map((result) =>
    result.status === 'fulfilled'
      ? result.value
      : { success: false, error: result.reason?.message || 'Request failed' },
  )
}

// 保存音频到文件的辅助函数
export function saveAudioToFile(
  audioBuffer: ArrayBuffer,
  filename: string,
): void {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } else {
    // Node.js环境
    const fs = require('fs')
    const buffer = Buffer.from(audioBuffer)
    fs.writeFileSync(filename, buffer)
  }
}

export type DoubaoTTSPreset = {
  voiceType: DoubaoTTSVoiceType
  encoding: DoubaoTTSEncoding
  speedRatio: number
  volumeRatio: number
  pitchRatio: number
  language?: DoubaoTTSLanguage
}

// 预设的常用配置 - 只使用确认可用的音色
export const DoubaoTTSPresets: Record<string, DoubaoTTSPreset> = {
  male: {
    voiceType: 'zh_male_M392_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
  maleStandard: {
    voiceType: 'zh_male_M001_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
  female: {
    voiceType: 'zh_female_F001_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
  slow: {
    voiceType: 'zh_male_M392_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 0.8,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
  fast: {
    voiceType: 'zh_male_M392_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.5,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
  // 其他音色可能需要额外授权，先注释掉
  // 'zh_female_F421_conversation_wvae_bigtts': {
  //   voiceType: 'zh_female_F421_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_male_M101_conversation_wvae_bigtts': {
  //   voiceType: 'zh_male_M101_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_female_F101_conversation_wvae_bigtts': {
  //   voiceType: 'zh_female_F101_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_male_M201_conversation_wvae_bigtts': {
  //   voiceType: 'zh_male_M201_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_female_F201_conversation_wvae_bigtts': {
  //   voiceType: 'zh_female_F201_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_male_M301_conversation_wvae_bigtts': {
  //   voiceType: 'zh_male_M301_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  // 'zh_female_F301_conversation_wvae_bigtts': {
  //   voiceType: 'zh_female_F301_conversation_wvae_bigtts',
  //   encoding: 'mp3',
  //   speedRatio: 1.0,
  //   volumeRatio: 1.0,
  //   pitchRatio: 1.0
  // },
  english: {
    voiceType: 'en_male_M001_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
    language: 'en',
  },
  multilingual: {
    voiceType: 'multi_male_M001_conversation_wvae_bigtts',
    encoding: 'mp3',
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 1.0,
  },
}

// 错误码映射
export const DoubaoTTSErrorCodes = {
  3000: 'Success',
  3001: 'Invalid request - check parameters',
  3003: 'Concurrency limit exceeded - retry or switch to offline',
  3005: 'Backend service busy - retry or switch to offline',
  3006: 'Service interrupted - check parameters',
  3010: 'Text length exceeded limit',
  3011: 'Invalid text - empty text or language mismatch',
  3030: 'Processing timeout - retry or check text',
  3031: 'Processing error - retry or switch to offline',
  3032: 'Audio retrieval timeout - retry or switch to offline',
  3040: 'Backend connection error - retry',
  3050: 'Voice type not found - check voice_type parameter',
} as const

// 根据音色类型获取推荐语言
export function getRecommendedLanguage(
  voiceType: DoubaoTTSVoiceType,
): DoubaoTTSLanguage | undefined {
  if (voiceType.startsWith('zh_')) return 'zh'
  if (voiceType.startsWith('en_')) return 'en'
  if (voiceType.startsWith('multi_')) return undefined // 多语种不需要指定
  return 'zh' // 默认中文
}

// 验证音色和语言的匹配性
export function validateVoiceLanguage(
  voiceType: DoubaoTTSVoiceType,
  language?: DoubaoTTSLanguage,
): boolean {
  const recommended = getRecommendedLanguage(voiceType)
  if (!recommended) return true // 多语种音色支持所有语言
  if (!language) return true // 未指定语言时允许
  return recommended === language
}
