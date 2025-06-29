import { env } from '@/lib/env'
import { firstValueFrom, lastValueFrom } from 'rxjs'

import * as seedance from './seedance'

// 使用示例
const context: seedance.SeedanceContext = {
  apiKey: env.X_302_API_KEY,
}

// 文生视频示例
async function textToVideoExample() {
  const textInput: seedance.SeedanceInput = {
    model: 'doubao-seedance-1-0-lite-i2v-250428',
    content: [
      {
        type: 'text',
        text: '写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近，最终定格在一朵雏菊花的特写上，花瓣上有几颗晶莹的露珠。--resolution 720p --ratio16:9 --dur 5 --fps 24 --wm true --seed 11 --cf false',
      },
    ],
  }

  try {
    // 提交视频生成任务
    const result = await firstValueFrom(
      seedance.generateVideo(textInput, context),
    )
    console.log('Task submitted:', result.id)

    // 轮询获取结果
    let taskResult
    do {
      await new Promise((resolve) => setTimeout(resolve, 5000)) // 等待5秒
      taskResult = await firstValueFrom(
        seedance.fetchTask({ taskId: result.id }, context),
      )
      console.log('Task status:', taskResult.status)
    } while (
      taskResult.status !== 'succeeded' &&
      taskResult.status !== 'failed'
    )

    if (taskResult.status === 'succeeded') {
      console.log('Video generated successfully:', taskResult.content.video_url)
      console.log('Usage tokens:', taskResult.usage.completion_tokens)
    } else {
      console.error('Video generation failed')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// 图生视频示例
async function imageToVideoExample() {
  const imageInput: seedance.SeedanceInput = {
    model: 'doubao-seedance-1-0-lite-i2v-250428',
    content: [
      {
        type: 'text',
        text: '女孩抱着狐狸，女孩睁开眼，温柔地看向镜头，狐狸友善地抱着，镜头缓缓拉出，女孩的头发被风吹动 --ratio adaptive --dur 10',
      },
      {
        type: 'image_url',
        image_url: {
          url: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/i2v_foxrgirl.png',
        },
      },
    ],
  }

  try {
    // 提交视频生成任务
    const result = await firstValueFrom(
      seedance.generateVideo(imageInput, context),
    )
    console.log('Task submitted:', result.id)

    // 使用 watch 函数监控任务状态
    const finalResult = await lastValueFrom(
      seedance.watch({ taskId: result.id }, context),
    )

    if (finalResult.status === 'succeeded') {
      console.log(
        'Video generated successfully:',
        finalResult.content.video_url,
      )
      console.log('Usage tokens:', finalResult.usage.completion_tokens)
    } else {
      console.error('Video generation failed')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// 使用 watch 函数的简化示例
async function watchExample() {
  const textInput: seedance.SeedanceInput = {
    model: 'doubao-seedance-1-0-lite-i2v-250428',
    content: [
      {
        type: 'text',
        text: '写实风格，晴朗的蓝天之下，一大片白色的雏菊花田 --resolution 720p --ratio16:9 --dur 5',
      },
    ],
  }

  try {
    // 提交任务
    const result = await firstValueFrom(
      seedance.generateVideo(textInput, context),
    )
    console.log('Task submitted:', result.id)

    // 方式1: 使用 subscribe 监听每个状态更新
    seedance.watch({ taskId: result.id }, context).subscribe({
      next: (taskResult) => {
        console.log('Task status:', taskResult.status)
        if (taskResult.status === 'succeeded') {
          console.log('Video URL:', taskResult.content.video_url)
        }
      },
      error: (error) => console.error('Watch error:', error),
      complete: () => console.log('Task monitoring completed'),
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

// 使用 lastValueFrom 的示例（推荐用于获取最终结果）
async function lastValueExample() {
  const textInput: seedance.SeedanceInput = {
    model: 'doubao-seedance-1-0-lite-i2v-250428',
    content: [
      {
        type: 'text',
        text: '写实风格，晴朗的蓝天之下，一大片白色的雏菊花田 --resolution 720p --ratio16:9 --dur 5',
      },
    ],
  }

  try {
    // 提交任务
    const result = await firstValueFrom(
      seedance.generateVideo(textInput, context),
    )
    console.log('Task submitted:', result.id)

    // 使用 lastValueFrom 获取最终结果（任务完成时的最后一个状态）
    const finalResult = await lastValueFrom(
      seedance.watch({ taskId: result.id }, context),
    )

    if (finalResult.status === 'succeeded') {
      console.log('Video URL:', finalResult.content.video_url)
    } else {
      console.error('Generation failed')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// 运行示例
// textToVideoExample()
// imageToVideoExample()
// watchExample() - 使用 subscribe 监听过程
// lastValueExample() - 使用 lastValueFrom 获取最终结果
