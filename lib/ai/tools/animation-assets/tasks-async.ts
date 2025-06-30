import * as midjourney from '@/integration/302/midjourney'
import * as minimaxAudio from '@/integration/302/minimax-audio'
import { createCloudflareR2PublicDevUrl, s3 } from '@/integration/s3'
import { getDatabase, t } from '@/lib/db'
import { env } from '@/lib/env'
import { getQuadrantByPosition } from '@/lib/image'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { stringifyJSON5 } from 'confbox'
import { eq } from 'drizzle-orm'
import { after } from 'next/server'
import { lastValueFrom, tap } from 'rxjs'
import { ulid } from 'ulid'

// 类型定义
export type GenerateAudioAssetInput = {
  storyId: string
  sceneId: string
  narrationText: string
  voiceOptions?: {
    voiceId?: string
    speed?: number
    volume?: number
    pitch?: number
  }
}

export type GenerateImageAssetInput = {
  storyId: string
  sceneId: string
  visualPrompt: string
  imageOptions?: {
    botType?: 'MID_JOURNEY' | 'NIJI_JOURNEY'
  }
}

export type AudioAssetResult = {
  assetId: string
  s3Url: string
  s3Key: string
  duration?: number
  fileSize: number
}

export type ImageAssetResult = {
  assetId: string
  s3Url: string
  s3Key: string
  imageWidth?: number
  imageHeight?: number
  midjourneyTaskId?: string
}

async function updateTaskStatus(input: {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  s3Url?: string
  s3Key?: string
  fileSize?: string
  duration?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}) {
  await getDatabase()
    .update(t.animationAsset)
    .set({
      status: input.status,
      s3Url: input.s3Url || '',
      s3Key: input.s3Key || '',
      fileSize: input.fileSize,
      duration: input.duration,
      errorMessage: input.errorMessage,
      metadata: input.metadata,
      updatedAt: new Date(),
    })
    .where(eq(t.animationAsset.id, input.id))
}

async function createTask(input: {
  storyId: string
  sceneId: string
  assetType: 'audio' | 'image'
  contentType: string
  metadata?: Record<string, unknown>
}) {
  const id = ulid()
  await getDatabase().insert(t.animationAsset).values({
    id,
    storyId: input.storyId,
    sceneId: input.sceneId,
    assetType: input.assetType,
    s3Url: '',
    s3Key: '',
    contentType: input.contentType,
    status: 'pending',
    metadata: input.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return { id }
}

async function uploadToS3(input: {
  buffer: ArrayBuffer
  filename: string
  storyId: string
  sceneId: string
  assetType: 'audio' | 'image'
  contentType: string
}) {
  const key = `stories/${input.storyId}/scenes/${input.sceneId}/${input.assetType}/${input.filename}`
  const bucket = env.CLOUDFLARE_R2_BUCKET_NAME

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: new Uint8Array(input.buffer),
    ContentType: input.contentType,
    Metadata: {
      storyId: input.storyId,
      sceneId: input.sceneId,
      assetType: input.assetType,
    },
  })

  await s3.send(command)

  const url = createCloudflareR2PublicDevUrl({ key })

  return {
    url,
    key,
    bucket,
    size: input.buffer.byteLength,
  }
}

// 异步版本：创建任务并在后台处理，立即返回任务ID
export async function generateAudioAsync(
  input: GenerateAudioAssetInput,
): Promise<{ taskId: string }> {
  console.log(
    `🎵 [Audio Async] Starting generation for story:${input.storyId} scene:${input.sceneId}`,
  )

  // 创建任务记录
  const task = await createTask({
    storyId: input.storyId,
    sceneId: input.sceneId,
    assetType: 'audio',
    contentType: 'audio/mpeg',
    metadata: {
      originalText: input.narrationText,
      voiceOptions: input.voiceOptions,
    },
  })

  console.log(`🎵 [Audio Async] Created task record: ${task.id}`)

  // 使用 after() 在后台处理
  after(async () => {
    try {
      await updateTaskStatus({
        id: task.id,
        status: 'processing',
      })

      console.log(
        `🎵 [Audio Async] Task ${task.id} status updated to processing`,
      )

      const { task_id } = await minimaxAudio.generateAudio(
        {
          model: minimaxAudio.MODELS.SPEECH_02_TURBO,
          text: input.narrationText,
          voice_setting: {
            voice_id: input.voiceOptions?.voiceId || 'English_Persuasive_Man',
            speed: input.voiceOptions?.speed || 1.0,
            vol: input.voiceOptions?.volume || 1.0,
            pitch: input.voiceOptions?.pitch || 1.0,
          },
          audio_setting: {
            channel: 1,
            format: 'mp3',
          },
        },
        {
          apiKey: env.X_302_API_KEY,
        },
      )

      console.log(
        `🎵 [Audio Async] Task ${task.id} -> Minimax task_id: ${task_id}`,
      )

      const {
        filename,
        audioBuffer,
        sizeBytes,
        audioFormat,
        duration,
        durationMs,
        metadata,
        timingInfo,
      } = await minimaxAudio.pollAndDownload({
        taskId: task_id,
        apiKey: env.X_302_API_KEY,
        intervalMs: 3000,
        onProgress: (status) => {
          console.log(
            `🎵 [Audio Async] Task ${task.id} (minimax: ${task_id}) progress: ${status.status}`,
          )
        },
      })

      console.log(`🎵 [Audio Async] Task ${task.id} audio metadata:`, {
        duration: `${duration}s`,
        durationMs: `${durationMs}ms`,
        sampleRate: metadata.audio_sample_rate,
        bitrate: metadata.bitrate,
        wordCount: metadata.word_count,
      })

      const uniqueFilename = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${audioFormat}`

      const s3Result = await uploadToS3({
        buffer: audioBuffer,
        filename: uniqueFilename,
        storyId: input.storyId,
        sceneId: input.sceneId,
        assetType: 'audio',
        contentType: 'audio/mpeg',
      })

      await updateTaskStatus({
        id: task.id,
        status: 'completed',
        s3Url: s3Result.url,
        s3Key: s3Result.key,
        fileSize: sizeBytes.toString(),
        duration: duration.toString(), // 保存时长（秒）
        metadata: {
          originalText: input.narrationText,
          voiceOptions: input.voiceOptions,
          audioFormat,
          originalFilename: filename,
          // 保存完整的音频元数据
          duration,
          durationMs,
          audioMetadata: metadata,
          timingInfo,
        },
      })

      console.log(`🎵 [Audio Async] Task ${task.id} completed successfully!`)
    } catch (error) {
      console.error(`🎵 [Audio Async] Task ${task.id} failed:`, error)
      await updateTaskStatus({
        id: task.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  // 立即返回任务ID
  return { taskId: task.id }
}

// 异步版本：创建任务并在后台处理，立即返回任务ID
export async function generateImageAsync(
  input: GenerateImageAssetInput,
): Promise<{ taskId: string }> {
  console.log(
    `🖼️ [Image Async] Starting generation for story:${input.storyId} scene:${input.sceneId}`,
  )

  // 创建任务记录
  const task = await createTask({
    storyId: input.storyId,
    sceneId: input.sceneId,
    assetType: 'image',
    contentType: 'image/png',
    metadata: {
      originalPrompt: input.visualPrompt,
      imageOptions: input.imageOptions,
    },
  })

  console.log(`🖼️ [Image Async] Created task record: ${task.id}`)

  // 使用 after() 在后台处理
  after(async () => {
    try {
      await updateTaskStatus({
        id: task.id,
        status: 'processing',
      })

      const imagineResult = await lastValueFrom(
        midjourney.imagine(
          {
            prompt: input.visualPrompt,
            botType: input.imageOptions?.botType || 'MID_JOURNEY',
          },
          {
            apiSecret: env.X_302_API_KEY,
          },
        ),
      )

      console.log(
        `🖼️ [Image Async] Image generation started, task_id: ${imagineResult.result}`,
      )

      const finalStatus = await lastValueFrom(
        midjourney
          .watch(
            {
              taskId: imagineResult.result || '',
              interval: 5000,
            },
            {
              apiSecret: env.X_302_API_KEY,
            },
          )
          .pipe(
            tap((it) => {
              console.log('🖼️ [Image Async] Task status:', stringifyJSON5(it))
            }),
          ),
      )

      if (finalStatus.status !== 'SUCCESS') {
        const errorMsg =
          finalStatus.status === 'FAILURE'
            ? `Task failed: ${finalStatus.failReason || 'No failure reason provided'}`
            : `Unexpected final status: "${finalStatus.status}" (expected SUCCESS or FAILURE)`
        throw new Error(errorMsg)
      }

      if (!finalStatus.imageUrl) {
        throw new Error('No image URL in successful result')
      }

      const response = await fetch(finalStatus.imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`)
      }
      const imageBuffer = await response.arrayBuffer()

      const firstQuadrantBuffer = await getQuadrantByPosition(
        new Uint8Array(imageBuffer),
        'topLeft',
      )

      const uniqueFilename = `image_${ulid()}.png`

      const s3Result = await uploadToS3({
        buffer: new Uint8Array(firstQuadrantBuffer).buffer,
        filename: uniqueFilename,
        storyId: input.storyId,
        sceneId: input.sceneId,
        assetType: 'image',
        contentType: 'image/png',
      })

      await updateTaskStatus({
        id: task.id,
        status: 'completed',
        s3Url: s3Result.url,
        s3Key: s3Result.key,
        fileSize: s3Result.size?.toString(),
        metadata: {
          originalPrompt: input.visualPrompt,
          imageOptions: input.imageOptions,
          midjourneyTaskId: finalStatus.id,
          imageWidth: finalStatus.imageWidth
            ? Math.floor(finalStatus.imageWidth / 2)
            : undefined,
          imageHeight: finalStatus.imageHeight
            ? Math.floor(finalStatus.imageHeight / 2)
            : undefined,
          originalImageUrl: finalStatus.imageUrl,
          quadrantExtracted: 'topLeft',
          isQuadrantImage: true,
          originalImageWidth: finalStatus.imageWidth,
          originalImageHeight: finalStatus.imageHeight,
        },
      })

      console.log(`🖼️ [Image Async] Task ${task.id} completed successfully!`)
    } catch (error) {
      console.error(`🖼️ [Image Async] Task ${task.id} failed:`, error)
      await updateTaskStatus({
        id: task.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  // 立即返回任务ID
  return { taskId: task.id }
}

// 异步版本的主函数：创建所有任务并立即返回任务ID列表
export async function generateStoryAssetsAsync(input: {
  storyId: string
  scenes: Array<{
    scene_id: string // 修改为 string 类型
    narration_text: string
    visual_concept_prompt: string
  }>
  options?: {
    audioOptions?: GenerateAudioAssetInput['voiceOptions']
    imageOptions?: GenerateImageAssetInput['imageOptions']
  }
}) {
  type SceneTaskResult = {
    sceneId: string
    audioTaskId: string
    imageTaskId: string
  }

  const results: SceneTaskResult[] = []

  for (const scene of input.scenes) {
    const sceneId = scene.scene_id // 已经是 string，不需要转换

    console.log(`🚀 [Async] Creating tasks for scene ${sceneId}...`)

    // 并行创建音频和图片任务
    const [audioTask, imageTask] = await Promise.all([
      generateAudioAsync({
        storyId: input.storyId,
        sceneId,
        narrationText: scene.narration_text,
        voiceOptions: input.options?.audioOptions,
      }),
      generateImageAsync({
        storyId: input.storyId,
        sceneId,
        visualPrompt: scene.visual_concept_prompt,
        imageOptions: input.options?.imageOptions,
      }),
    ])

    results.push({
      sceneId,
      audioTaskId: audioTask.taskId,
      imageTaskId: imageTask.taskId,
    })

    console.log(`✅ [Async] Tasks created for scene ${sceneId}`)
  }

  return {
    storyId: input.storyId,
    totalScenes: input.scenes.length,
    results,
  }
}
