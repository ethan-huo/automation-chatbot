// Test Audio Duration Extraction
// 测试更新后的音频时长提取功能

import { env } from '@/lib/env'
import { stringifyJSON5 } from 'confbox'

import type { GenerateAudioInput, MinimaxAudioContext } from '../integration/302/minimax-audio'
import { generateAudio, MODELS, pollAndDownload } from '../integration/302/minimax-audio'

async function testAudioDuration() {
  console.log('🎵 测试音频时长提取功能...\n')

  const context: MinimaxAudioContext = {
    apiKey: env.X_302_API_KEY,
  }

  const input: GenerateAudioInput = {
    model: MODELS.SPEECH_02_TURBO,
    text: 'This is a short test to verify that we can extract audio duration from the metadata files.',
    voice_setting: {
      voice_id: 'English_Persuasive_Man',
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    },
    audio_setting: {
      audio_sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
  }

  try {
    // 步骤 1: 创建音频生成任务
    console.log('🚀 创建音频生成任务...')
    console.log(`📝 文本: "${input.text}"`)
    console.log()

    const result = await generateAudio(input, context)
    console.log('✅ 任务创建成功!')
    console.log(`📋 Task ID: ${result.task_id}`)
    console.log()

    // 步骤 2: 轮询任务状态并下载文件（包含元数据）
    console.log('🔄 轮询任务状态并下载文件...')

    const downloadResult = await pollAndDownload({
      taskId: result.task_id,
      apiKey: context.apiKey,
      maxAttempts: 60,
      intervalMs: 3000,
      onProgress: (status) => {
        console.log(`📊 任务状态: ${status.status}`)
      },
      onDownloadStart: () => {
        console.log('📥 任务完成，开始下载音频文件...')
      },
    })

    console.log()
    console.log('🎉 音频生成和下载完成!')
    console.log()
    
    // 步骤 3: 显示提取的元数据
    console.log('📊 提取的音频元数据:')
    console.log(`- 文件名: ${downloadResult.filename}`)
    console.log(`- 音频格式: ${downloadResult.audioFormat}`)
    console.log(`- 文件大小: ${downloadResult.sizeBytes} bytes`)
    console.log(`- 时长: ${downloadResult.duration} 秒`)
    console.log(`- 时长: ${downloadResult.durationMs} 毫秒`)
    console.log()
    
    console.log('🔧 详细音频元数据:')
    console.log(`- 采样率: ${downloadResult.metadata.audio_sample_rate} Hz`)
    console.log(`- 比特率: ${downloadResult.metadata.bitrate} bps`)
    console.log(`- 字数: ${downloadResult.metadata.word_count}`)
    console.log(`- 音量: ${downloadResult.metadata.vol}`)
    console.log(`- 状态码: ${downloadResult.metadata.status_code}`)
    console.log()
    
    console.log('⏱️ 时间轴信息:')
    downloadResult.timingInfo.forEach((timing, index) => {
      console.log(`  ${index + 1}. "${timing.text}"`)
      console.log(`     时间: ${timing.time_begin}ms - ${timing.time_end}ms`)
      console.log(`     文本位置: ${timing.text_begin} - ${timing.text_end}`)
    })
    console.log()
    
    console.log('📋 完整元数据 JSON:')
    console.log('Audio Metadata:', stringifyJSON5(downloadResult.metadata))
    console.log('Timing Info:', stringifyJSON5(downloadResult.timingInfo))

    console.log()
    console.log('🎊 测试完成! 音频时长提取功能正常工作。')
    
  } catch (error) {
    console.error()
    console.error('❌ 测试失败:')
    console.error(error)

    if (error instanceof Error) {
      console.error('错误详情:', error.message)
      if (error.stack) {
        console.error('堆栈跟踪:', error.stack)
      }
    }
  }
}

// 运行测试
if (require.main === module) {
  testAudioDuration().catch(console.error)
}

export { testAudioDuration }
