// Minimax Audio Metadata Test Script
// 测试下载音频并解包 tar 文件查看元数据

import { writeFileSync } from 'node:fs'
import { env } from '@/lib/env'
import { stringifyJSON5 } from 'confbox'

import type { GenerateAudioInput, MinimaxAudioContext } from '../integration/302/minimax-audio'
import { generateAudio, MODELS, pollAndDownload } from '../integration/302/minimax-audio'

async function testAudioMetadata() {
  console.log('🎵 Minimax 音频元数据测试开始...\n')

  const context: MinimaxAudioContext = {
    apiKey: env.X_302_API_KEY,
  }

  const input: GenerateAudioInput = {
    model: MODELS.SPEECH_02_TURBO,
    text: 'This is a test audio for metadata extraction. We want to see the duration and other metadata information.',
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
    console.log('🚀 步骤 1: 创建音频生成任务...')
    console.log('📝 输入参数:')
    console.log(`- 模型: ${input.model}`)
    console.log(`- 声音ID: ${input.voice_setting.voice_id}`)
    console.log(`- 文本: "${input.text}"`)
    console.log(`- 音频格式: ${input.audio_setting?.format}`)
    console.log()

    const result = await generateAudio(input, context)
    console.log('✅ 任务创建成功!')
    console.log('📋 任务信息:')
    console.log(`- Task ID: ${result.task_id}`)
    console.log(`- File ID: ${result.file_id}`)
    console.log(`- 字符使用量: ${result.usage_characters}`)
    console.log()

    // 步骤 2: 轮询任务状态并下载文件
    console.log('🔄 步骤 2: 轮询任务状态并下载文件...')

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
    console.log('📊 下载结果:')
    console.log(`- 文件名: ${downloadResult.filename}`)
    console.log(`- 音频格式: ${downloadResult.audioFormat}`)
    console.log(`- 文件大小: ${downloadResult.sizeBytes} bytes`)

    // 步骤 3: 保存音频文件
    console.log()
    console.log('💾 步骤 3: 保存音频文件...')

    const timestamp = Date.now()
    const extension = downloadResult.audioFormat === 'wav' ? 'wav' : 'mp3'
    const filename = `minimax-audio-${timestamp}.${extension}`
    const audioBuffer = Buffer.from(downloadResult.audioBuffer)

    writeFileSync(filename, audioBuffer)
    console.log(`✅ 音频文件已保存: ${filename}`)

    // 步骤 4: 下载原始 tar 文件用于手动解包
    console.log()
    console.log('📦 步骤 4: 下载原始 tar 文件...')
    
    // 重新下载 tar 文件但不解包
    const fileInfoResponse = await fetch(
      `https://api.302.ai/minimaxi/v1/files/retrieve?file_id=${result.file_id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
        },
      },
    )

    if (!fileInfoResponse.ok) {
      throw new Error(`File info request failed: ${fileInfoResponse.statusText}`)
    }

    const fileInfo = await fileInfoResponse.json()
    console.log('📋 文件信息:')
    console.log(stringifyJSON5(fileInfo))

    const downloadUrl = fileInfo.file.download_url
    const tarResponse = await fetch(downloadUrl)
    const tarBuffer = await tarResponse.arrayBuffer()

    const tarFilename = `minimax-audio-${timestamp}.tar`
    writeFileSync(tarFilename, Buffer.from(tarBuffer))
    console.log(`✅ Tar 文件已保存: ${tarFilename}`)
    console.log(`📁 Tar 文件大小: ${tarBuffer.byteLength} bytes`)

    console.log()
    console.log('🔧 手动解包命令:')
    console.log(`tar -tf ${tarFilename}  # 查看文件列表`)
    console.log(`tar -xvf ${tarFilename}  # 解包所有文件`)
    console.log(`tar -xf ${tarFilename} && ls -la  # 解包并查看文件`)

    console.log()
    console.log('🎊 测试完成! 请手动解包 tar 文件查看元数据。')
    
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
  testAudioMetadata().catch(console.error)
}

export { testAudioMetadata }
