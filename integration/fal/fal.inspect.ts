import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { inspect } from 'node:util'
import { env } from '@/lib/env'

import { fal } from './fal.client'
import { FalModel } from './fal.models'

fal.config({ credentials: env.FAL_API_KEY })

// 将图片文件转换为 base64 字符串
async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = await readFile(imagePath)
  const base64String = imageBuffer.toString('base64')
  const mimeType = getMimeType(imagePath)

  return `data:${mimeType};base64,${base64String}`
}

// 根据文件扩展名获取 MIME 类型
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }
  return mimeTypes[ext || ''] || 'image/jpeg'
}

// 第一步：简单的队列提交测试
async function testQueueSubmit(): Promise<string> {
  try {
    console.log('=== 提交任务到队列 ===')

    const { request_id } = await fal.queue.submit(
      FalModel.FLEX_PRO_KONTEXT_TEXT_TO_IMAGE,
      {
        input: {
          prompt:
            `In the distinct anime style of One Piece's Alabasta arc, a dynamic medium shot in a vast desert. The tall villain Sir Crocodile begins a powerful forward lunge, his body leaning into the attack. His golden hook is just starting to elongate and sharpen into a spear, aimed directly at Monkey D. Luffy. Luffy, wearing his red vest, has a surprised expression, his body just beginning to lean back, knees bending in the initial moment of evasion. The scene is filled with anticipatory tension.`,
        },
      },
    )

    console.log('✅ 任务提交成功!')
    console.log('Request ID:', request_id)

    return request_id
  } catch (error) {
    console.error('❌ 任务提交失败:', error)
    throw error
  }
}

// 第二步：查询任务状态
async function testQueueStatus(requestId: string): Promise<string> {
  try {
    console.log('\n=== 查询任务状态 ===')
    console.log('Request ID:', requestId)

    const status = await fal.queue.status(FalModel.FLEX_PRO_KONTEXT, {
      requestId,
      logs: true,
    })

    console.log('任务状态:', status.status)
    // 根据 common.d.ts，只有 InProgressQueueStatus 和 CompletedQueueStatus 有 logs
    if ('logs' in status && status.logs && status.logs.length > 0) {
      console.log('日志:', status.logs)
    }

    return status.status
  } catch (error) {
    console.error('❌ 状态查询失败:', error)
    throw error
  }
}

// 第三步：获取结果
async function testQueueResult(requestId: string): Promise<void> {
  try {
    console.log('\n=== 获取任务结果 ===')

    const result = await fal.queue.result(FalModel.FLEX_PRO_KONTEXT, {
      requestId,
    })

    console.log('✅ 任务完成!')
    console.log('结果:', inspect(result.data, { depth: null }))
  } catch (error) {
    console.error('❌ 获取结果失败:', error)
    // 如果是 ValidationError，显示详细信息
    if (error && typeof error === 'object' && 'body' in error) {
      console.error(
        '错误详情:',
        inspect(error.body, { depth: null, colors: true }),
      )
    }
    throw error
  }
}

// 运行测试
async function runTest(): Promise<void> {
  try {
    const requestId = await testQueueSubmit()

    // 轮询状态直到完成
    let status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_QUEUE'
    let attempts = 0
    const maxAttempts = 30 // 最多等待 1 分钟

    while (status !== 'COMPLETED' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // 等待 2 秒
      const currentStatus = await testQueueStatus(requestId)

      // 根据 common.d.ts 的类型定义，状态只能是这三种
      if (
        currentStatus === 'IN_QUEUE' ||
        currentStatus === 'IN_PROGRESS' ||
        currentStatus === 'COMPLETED'
      ) {
        status = currentStatus
      } else {
        console.error('❌ 未知的任务状态:', currentStatus)
        return
      }

      attempts++
    }

    if (status === 'COMPLETED') {
      await testQueueResult(requestId)
    } else {
      console.log('⏱️ 任务仍在处理中，请稍后手动查询结果')
      console.log('Request ID:', requestId)
    }
  } catch (error) {
    console.error('测试失败:', error)
    // 显示完整的错误信息
    if (error && typeof error === 'object' && 'body' in error) {
      console.error(
        '完整错误信息:',
        inspect(error.body, { depth: null, colors: true }),
      )
    }
  }
}

// 也可以直接测试特定任务的结果
async function testSpecificResult(): Promise<void> {
  const requestId = 'a3f6f731-9056-4dea-8937-2b32f59b8f7b' // 之前的任务ID

  try {
    const status = await testQueueStatus(requestId)
    if (status === 'COMPLETED') {
      await testQueueResult(requestId)
    } else {
      console.log(`任务状态: ${status}，还未完成`)
    }
  } catch (error) {
    console.error('测试特定结果失败:', error)
  }
}

// 执行测试 - 测试新任务的完整流程
runTest()

// 如果只想测试之前的任务，取消注释下面这行
// testSpecificResult()
