// Minimax Audio Generation Test Script
// 独立测试脚本，演示完整的音频生成流程

import { writeFileSync } from 'node:fs'
import { inspect } from 'node:util'
import { env } from '@/lib/env'
import { stringifyJSON5 } from 'confbox'

import type { GenerateAudioInput, MinimaxAudioContext } from './minimax-audio'
import { generateAudio, MODELS, pollAndDownload } from './minimax-audio'

async function testMinimaxAudio() {
  console.log('🎵 Minimax 音频生成测试开始...\n')

  const context: MinimaxAudioContext = {
    apiKey: env.X_302_API_KEY,
  }

  const input: GenerateAudioInput = {
    model: MODELS.SPEECH_02_TURBO,
    text: 'Hello, this is a test of the Minimax audio generation system. The voice you are hearing is English Persuasive Man, demonstrating high-quality text-to-speech capabilities.',
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
      channel: 2,
    },
  }

  try {
    // 步骤 1: 创建音频生成任务
    console.log('🚀 步骤 1: 创建音频生成任务...')
    console.log('📝 输入参数:')
    console.log(`- 模型: ${input.model}`)
    console.log(`- 声音ID: ${input.voice_setting.voice_id}`)
    console.log(`- 文本长度: ${input.text.length} 字符`)
    console.log(`- 音频格式: ${input.audio_setting?.format}`)
    console.log()

    const result = await generateAudio(input, context)
    console.log('✅ 任务创建成功!')
    console.log('📋 任务信息:')
    console.log(`- Task ID: ${result.task_id}`)
    console.log(`- File ID: ${result.file_id}`)
    console.log(`- 字符使用量: ${result.usage_characters}`)
    console.log(`- 状态: ${result.base_resp.status_msg}`)
    console.log()

    // 步骤 2: 轮询任务状态并下载文件
    console.log('🔄 步骤 2: 轮询任务状态并下载文件...')

    const downloadResult = await pollAndDownload({
      taskId: result.task_id,
      apiKey: context.apiKey,
      maxAttempts: 60,
      intervalMs: 2000,
      onProgress: (status) => {
        console.log(`📊 任务状态: ${stringifyJSON5(status)}`)
      },
      onDownloadStart: () => {
        console.log('📥 任务完成，开始下载音频文件...')
      },
    })

    console.log()
    console.log('🎉 音频生成和下载完成!')
    console.log('📊 下载结果:')
    console.log(`- 文件名: ${downloadResult.filename}`)
    console.log(`- 音频格式: ${downloadResult.audioFormat}`)
    console.log(`- 文件大小: ${downloadResult.sizeBytes} bytes`)
    console.log(
      `- Audio Buffer Size: ${downloadResult.audioBuffer.byteLength} bytes`,
    )

    // 步骤 3: 保存音频文件
    console.log()
    console.log('💾 步骤 3: 保存音频文件...')

    const timestamp = Date.now()
    const extension = downloadResult.audioFormat === 'wav' ? 'wav' : 'mp3'
    const filename = `minimax-audio-${timestamp}.${extension}`
    const audioBuffer = Buffer.from(downloadResult.audioBuffer)

    writeFileSync(filename, audioBuffer)
    console.log(`✅ 音频文件已保存: ${filename}`)
    console.log(`📁 文件大小: ${audioBuffer.length} bytes`)
    console.log(`🎵 原始文件名: ${downloadResult.filename}`)

    console.log()
    console.log('🎊 测试完成! 所有步骤都成功执行。')
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

// 测试下载 API 返回的实际内容
async function testDownloadResponse() {
  console.log('🔍 测试下载 API 返回内容...\n')

  const context: MinimaxAudioContext = {
    apiKey: env.X_302_API_KEY,
  }

  // 使用一个已知的 file_id
  const fileId = 284278650286469

  try {
    const response = await fetch(
      `https://api.302.ai/minimaxi/v1/files/retrieve?file_id=${fileId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
        },
      },
    )

    console.log('📋 响应信息:')
    console.log(`- Status: ${response.status} ${response.statusText}`)
    console.log(`- Content-Type: ${response.headers.get('content-type')}`)
    console.log(`- Content-Length: ${response.headers.get('content-length')}`)
    console.log()

    // 先尝试读取为文本看看是什么内容
    const textContent = await response.text()
    console.log('📄 响应内容:')
    console.log(textContent)
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
if (require.main === module) {
  console.log('🎯 开始 Minimax 音频生成独立测试')
  console.log('='.repeat(50))
  testMinimaxAudio().catch((error) => {
    console.error('💥 未捕获的错误:', error)
    process.exit(1)
  })
}

export { testMinimaxAudio }
