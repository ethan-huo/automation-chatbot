import type { Session } from 'next-auth'
import { projectSchema } from '@/artifacts/project/schema'
import {
  createSpeedPainterTask,
  DEFAULT_CANVAS_TITLE,
  DEFAULT_HAND_TITLE,
  getTaskStatus,
} from '@/integration/speedpainter'
import { db, getDatabase, t } from '@/lib/db'
import { os } from '@orpc/server'
import { and, eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { z } from 'zod'

const implement = os.$context<{
  headers: Headers
  session: Session | null
}>()

const updateProject = implement
  .input(
    z.object({
      artifactId: z.string(),
      project: projectSchema,
    }),
  )
  .handler(async ({ input, context }) => {
    const { artifactId, project } = input

    await db
      .update(t.document)
      .set({
        content: JSON.stringify(project),
      })
      .where(eq(t.document.id, artifactId))

    return {
      success: true,
    }
  })

const getAnimationAsset = implement
  .input(
    z.object({
      storyId: z.string(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { storyId } = input

    if (!context.session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const assets = await db
      .select()
      .from(t.animationAsset)
      .where(eq(t.animationAsset.storyId, storyId))

    // 计算待处理的资产数量
    const pendingAssets = assets.filter(
      (asset) => asset.status === 'pending' || asset.status === 'processing',
    ).length

    // 将资产按场景和类型组织
    const assetsByScene = assets.reduce(
      (acc, asset) => {
        const sceneId = asset.sceneId
        if (!acc[sceneId]) {
          acc[sceneId] = {
            audio: null,
            images: [],
            whiteboardAnimation: null,
          }
        }
        if (asset.assetType === 'audio') {
          acc[sceneId].audio = asset
        } else if (asset.assetType === 'image') {
          acc[sceneId].images.push(asset)
        } else if (asset.assetType === 'whiteboard_animation') {
          acc[sceneId].whiteboardAnimation = asset
        }
        return acc
      },
      {} as Record<
        string,
        {
          audio: any | null
          images: any[]
          whiteboardAnimation: any | null
        }
      >,
    )

    return {
      assets,
      assetsByScene,
      pendingAssets,
      totalAssets: assets.length,
    }
  })

const createWhiteboardAnimation = implement
  .input(
    z.object({
      imageAssetId: z.string().describe('The ID of the completed image asset'),
      storyId: z.string().describe('The story ID for organization'),
      sceneId: z.string().describe('The scene ID for organization'),
    }),
  )
  .handler(async ({ input, context }) => {
    const { imageAssetId, storyId, sceneId } = input

    console.log(
      '[createWhiteboardAnimation] 🎬 Starting whiteboard animation creation:',
      {
        imageAssetId,
        storyId,
        sceneId,
        userId: context.session?.user?.id,
      },
    )

    try {
      if (!context.session?.user?.id) {
        console.error(
          '[createWhiteboardAnimation] ❌ Unauthorized access attempt',
        )
        throw new Error('Unauthorized')
      }

      // 检查原始图片资产是否存在且已完成
      console.log(
        '[createWhiteboardAnimation] 🔍 Checking image asset:',
        imageAssetId,
      )
      const imageAsset = await db
        .select()
        .from(t.animationAsset)
        .where(eq(t.animationAsset.id, imageAssetId))
        .limit(1)

      console.log('[createWhiteboardAnimation] 📊 Image asset query result:', {
        found: !!imageAsset[0],
        status: imageAsset[0]?.status,
        assetType: imageAsset[0]?.assetType,
      })

      if (!imageAsset[0]) {
        console.error(
          '[createWhiteboardAnimation] ❌ Image asset not found:',
          imageAssetId,
        )
        throw new Error('Image asset not found')
      }

      if (imageAsset[0].status !== 'completed') {
        console.error(
          '[createWhiteboardAnimation] ❌ Image asset not completed:',
          {
            imageAssetId,
            currentStatus: imageAsset[0].status,
          },
        )
        throw new Error('Image asset is not completed yet')
      }

      if (imageAsset[0].assetType !== 'image') {
        console.error('[createWhiteboardAnimation] ❌ Asset is not an image:', {
          imageAssetId,
          assetType: imageAsset[0].assetType,
        })
        throw new Error('Asset is not an image')
      }

      // 检查是否已经有白板动画任务
      const existingAnimation = await db
        .select()
        .from(t.animationAsset)
        .where(
          and(
            eq(t.animationAsset.storyId, storyId),
            eq(t.animationAsset.sceneId, sceneId),
            eq(t.animationAsset.assetType, 'whiteboard_animation'),
          ),
        )
        .limit(1)

      if (existingAnimation[0]) {
        return {
          taskId: existingAnimation[0].id,
          status: existingAnimation[0].status,
          message: 'Whiteboard animation task already exists',
        }
      }

      // 查找对应的音频资产以获取时长信息
      console.log(
        '[createWhiteboardAnimation] 🎵 Looking for audio asset for scene:',
        sceneId,
      )
      const audioAsset = await db
        .select()
        .from(t.animationAsset)
        .where(
          and(
            eq(t.animationAsset.storyId, storyId),
            eq(t.animationAsset.sceneId, sceneId),
            eq(t.animationAsset.assetType, 'audio'),
            eq(t.animationAsset.status, 'completed'),
          ),
        )
        .limit(1)

      console.log('[createWhiteboardAnimation] 🎵 Audio asset query result:', {
        found: !!audioAsset[0],
        duration: audioAsset[0]?.duration,
        audioUrl: audioAsset[0]?.s3Url,
      })

      // 检查音频资产是否存在且已完成
      if (!audioAsset[0]) {
        const errorMessage = `❌ Audio asset not found or not completed for scene ${sceneId}. Whiteboard animation requires completed audio to determine duration.`
        console.error('[createWhiteboardAnimation]', errorMessage, {
          storyId,
          sceneId,
          imageAssetId,
        })
        throw new Error(errorMessage)
      }

      if (!audioAsset[0].duration) {
        const errorMessage = `❌ Audio asset found but duration is missing for scene ${sceneId}. Cannot create whiteboard animation without audio duration.`
        console.error('[createWhiteboardAnimation]', errorMessage, {
          storyId,
          sceneId,
          audioAssetId: audioAsset[0].id,
          audioUrl: audioAsset[0].s3Url,
        })
        throw new Error(errorMessage)
      }

      const audioDuration = parseFloat(audioAsset[0].duration)
      if (isNaN(audioDuration) || audioDuration <= 0) {
        const errorMessage = `❌ Invalid audio duration "${audioAsset[0].duration}" for scene ${sceneId}. Duration must be a positive number.`
        console.error('[createWhiteboardAnimation]', errorMessage, {
          storyId,
          sceneId,
          audioAssetId: audioAsset[0].id,
          rawDuration: audioAsset[0].duration,
        })
        throw new Error(errorMessage)
      }

      console.log('[createWhiteboardAnimation] ✅ Audio validation passed:', {
        audioAssetId: audioAsset[0].id,
        duration: `${audioDuration}s`,
        audioUrl: audioAsset[0].s3Url,
      })

      // 创建白板动画任务
      const animationTaskId = ulid()
      await getDatabase().insert(t.animationAsset).values({
        id: animationTaskId,
        storyId,
        sceneId,
        assetType: 'whiteboard_animation',
        s3Url: '',
        s3Key: '',
        contentType: 'video/mp4',
        status: 'pending',
        metadata: {
          sourceImageAssetId: imageAssetId,
          sourceImageUrl: imageAsset[0].s3Url,
          sourceAudioAssetId: audioAsset[0].id,
          sourceAudioUrl: audioAsset[0].s3Url,
          audioDuration: audioAsset[0].duration,
          animationType: 'whiteboard_drawing',
          syncWithAudio: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // 启动实际的白板动画生成任务
      console.log(
        '[createWhiteboardAnimation] 🚀 Starting SpeedPainter task...',
        {
          sourceImageUrl: imageAsset[0].s3Url,
          audioDuration: `${audioDuration}s`,
          animationTaskId,
        },
      )

      try {
        const speedPainterResult = await createSpeedPainterTask({
        baseUrl: 'https://api.a1d.ai',
          imageUrl: imageAsset[0].s3Url,
          mimeType: 'image/jpeg',
          sketchDuration: Math.ceil(audioDuration), // 直接使用验证过的音频时长
          source: 'api',
          colorFillDuration: 0,
          needHand: true,
          needCanvas: false,
          canvasTitle: DEFAULT_CANVAS_TITLE,
          handTitle: DEFAULT_HAND_TITLE,
          needFadeout: true,
          fps: 24,
        })

        console.log(
          '[createWhiteboardAnimation] ✅ SpeedPainter task created:',
          {
            speedPainterTaskId: speedPainterResult.taskId,
            animationTaskId,
          },
        )

        // 更新数据库记录，保存 SpeedPainter 任务ID
        await db
          .update(t.animationAsset)
          .set({
            status: 'processing',
            metadata: {
              sourceImageAssetId: imageAssetId,
              sourceImageUrl: imageAsset[0].s3Url,
              sourceAudioAssetId: audioAsset[0]?.id,
              sourceAudioUrl: audioAsset[0]?.s3Url,
              audioDuration: audioAsset[0]?.duration,
              animationType: 'whiteboard_drawing',
              syncWithAudio: true,
              speedPainterTaskId: speedPainterResult.taskId, // 保存 SpeedPainter 任务ID
            },
            updatedAt: new Date(),
          })
          .where(eq(t.animationAsset.id, animationTaskId))
      } catch (speedPainterError) {
        console.error(
          '[createWhiteboardAnimation] ❌ Failed to create SpeedPainter task:',
          {
            error:
              speedPainterError instanceof Error
                ? speedPainterError.message
                : 'Unknown error',
            animationTaskId,
          },
        )

        // 更新任务状态为失败
        await db
          .update(t.animationAsset)
          .set({
            status: 'failed',
            errorMessage:
              speedPainterError instanceof Error
                ? speedPainterError.message
                : 'Failed to create SpeedPainter task',
            updatedAt: new Date(),
          })
          .where(eq(t.animationAsset.id, animationTaskId))

        throw speedPainterError
      }

      console.log(
        '[createWhiteboardAnimation] ✅ Whiteboard animation task created successfully:',
        {
          taskId: animationTaskId,
          imageAssetId,
          storyId,
          sceneId,
        },
      )

      return {
        taskId: animationTaskId,
        status: 'pending',
        message: 'Whiteboard animation task created successfully',
      }
    } catch (error) {
      console.error(
        '[createWhiteboardAnimation] 💥 Error creating whiteboard animation:',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          input: { imageAssetId, storyId, sceneId },
          userId: context.session?.user?.id,
        },
      )
      throw error
    }
  })

const getWhiteboardAnimationStatus = implement
  .input(
    z.object({
      taskId: z.string().describe('The whiteboard animation task ID'),
    }),
  )
  .handler(async ({ input, context }) => {
    const { taskId } = input

    console.log(
      '[getWhiteboardAnimationStatus] 🔍 Checking animation status:',
      {
        taskId,
        userId: context.session?.user?.id,
      },
    )

    try {
      if (!context.session?.user?.id) {
        console.error(
          '[getWhiteboardAnimationStatus] ❌ Unauthorized access attempt',
        )
        throw new Error('Unauthorized')
      }

      const animationTask = await db
        .select()
        .from(t.animationAsset)
        .where(eq(t.animationAsset.id, taskId))
        .limit(1)

      console.log('[getWhiteboardAnimationStatus] 📊 Task query result:', {
        taskId,
        found: !!animationTask[0],
        status: animationTask[0]?.status,
        assetType: animationTask[0]?.assetType,
      })

      if (!animationTask[0]) {
        console.error(
          '[getWhiteboardAnimationStatus] ❌ Animation task not found:',
          taskId,
        )
        throw new Error('Animation task not found')
      }

      if (animationTask[0].assetType !== 'whiteboard_animation') {
        console.error(
          '[getWhiteboardAnimationStatus] ❌ Task is not a whiteboard animation:',
          {
            taskId,
            assetType: animationTask[0].assetType,
          },
        )
        throw new Error('Task is not a whiteboard animation')
      }

      // 如果任务状态已经完成或失败，直接返回数据库状态
      let currentTask = animationTask[0]
      if (
        currentTask.status === 'completed' ||
        currentTask.status === 'failed'
      ) {
        console.log(
          '[getWhiteboardAnimationStatus] ✅ Task already completed/failed, returning database state:',
          {
            taskId,
            status: currentTask.status,
          },
        )

        const result = {
          taskId: currentTask.id,
          status: currentTask.status,
          s3Url: currentTask.s3Url,
          s3Key: currentTask.s3Key,
          errorMessage: currentTask.errorMessage,
          metadata: currentTask.metadata,
          createdAt: currentTask.createdAt,
          updatedAt: currentTask.updatedAt,
        }

        return result
      }

      // 如果任务状态还未完成，且有 SpeedPainter 任务ID，则查询最新状态
      if (
        (currentTask.status === 'pending' ||
          currentTask.status === 'processing') &&
        currentTask.metadata &&
        typeof currentTask.metadata === 'object' &&
        'speedPainterTaskId' in currentTask.metadata
      ) {
        const speedPainterTaskId = (currentTask.metadata as any)
          .speedPainterTaskId

        console.log(
          '[getWhiteboardAnimationStatus] 🔍 Checking SpeedPainter task status:',
          { speedPainterTaskId },
        )

        try {
          const speedPainterStatus = await getTaskStatus({
            taskId: speedPainterTaskId,
            baseUrl: 'https://api.a1d.ai',
          })

          console.log(
            '[getWhiteboardAnimationStatus] 📊 SpeedPainter status:',
            {
              taskId: speedPainterTaskId,
              status: speedPainterStatus.status,
              fullResponse: speedPainterStatus, // 添加完整响应以便调试
            },
          )

          // 根据 SpeedPainter 状态更新数据库
          let needsUpdate = false
          let newStatus: 'pending' | 'processing' | 'completed' | 'failed' =
            currentTask.status
          let newS3Url = currentTask.s3Url
          let newS3Key = currentTask.s3Key
          let newErrorMessage = currentTask.errorMessage

          console.log('[getWhiteboardAnimationStatus] 🔍 Status comparison:', {
            speedPainterStatus: speedPainterStatus.status,
            currentDbStatus: currentTask.status,
            isFinished: speedPainterStatus.status === 'FINISHED',
            isError: speedPainterStatus.status === 'ERROR',
          })

          if (speedPainterStatus.status === 'FINISHED') {
            needsUpdate = true
            newStatus = 'completed'
            newS3Url = speedPainterStatus.videoUrl
            newS3Key = `whiteboard-animations/${taskId}.mp4`
            console.log(
              '[getWhiteboardAnimationStatus] ✅ SpeedPainter task completed, updating database',
            )
          } else if (speedPainterStatus.status === 'ERROR') {
            needsUpdate = true
            newStatus = 'failed'
            newErrorMessage = speedPainterStatus.error
            console.log(
              '[getWhiteboardAnimationStatus] ❌ SpeedPainter task failed, updating database',
            )
          } else if (
            (speedPainterStatus.status === 'PROCESSING' ||
              speedPainterStatus.status === 'WAITING') &&
            currentTask.status === 'pending'
          ) {
            needsUpdate = true
            newStatus = 'processing'
            console.log(
              '[getWhiteboardAnimationStatus] 🔄 SpeedPainter task processing, updating database',
            )
          }

          if (needsUpdate) {
            const [updatedTask] = await db
              .update(t.animationAsset)
              .set({
                status: newStatus,
                s3Url: newS3Url,
                s3Key: newS3Key,
                errorMessage: newErrorMessage,
                updatedAt: new Date(),
              })
              .where(eq(t.animationAsset.id, taskId))
              .returning()

            if (updatedTask) {
              currentTask = updatedTask
              console.log(
                '[getWhiteboardAnimationStatus] ✅ Database updated successfully',
                {
                  taskId,
                  newStatus,
                  hasVideoUrl: !!newS3Url,
                },
              )
            }
          }
        } catch (speedPainterError) {
          console.error(
            '[getWhiteboardAnimationStatus] ❌ Failed to check SpeedPainter status:',
            {
              error:
                speedPainterError instanceof Error
                  ? speedPainterError.message
                  : 'Unknown error',
              speedPainterTaskId,
            },
          )
          // 不抛出错误，继续返回当前数据库状态
        }
      }

      const result = {
        taskId: currentTask.id,
        status: currentTask.status,
        s3Url: currentTask.s3Url,
        s3Key: currentTask.s3Key,
        errorMessage: currentTask.errorMessage,
        metadata: currentTask.metadata,
        createdAt: currentTask.createdAt,
        updatedAt: currentTask.updatedAt,
      }

      console.log(
        '[getWhiteboardAnimationStatus] ✅ Status retrieved successfully:',
        {
          taskId,
          status: result.status,
          hasS3Url: !!result.s3Url,
        },
      )

      return result
    } catch (error) {
      console.error(
        '[getWhiteboardAnimationStatus] 💥 Error getting animation status:',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          taskId,
          userId: context.session?.user?.id,
        },
      )
      throw error
    }
  })

const createStoryVideoComposition = implement
  .input(
    z.object({
      storyId: z.string().describe('The story ID to compose video for'),
      sceneIds: z
        .array(z.string())
        .describe('Array of scene IDs to include in composition'),
    }),
  )
  .handler(async ({ input, context }) => {
    const { storyId, sceneIds } = input

    console.log(
      '[createStoryVideoComposition] 🎬 Starting video composition:',
      {
        storyId,
        sceneIds,
        userId: context.session?.user?.id,
      },
    )

    try {
      if (!context.session?.user?.id) {
        console.error(
          '[createStoryVideoComposition] ❌ Unauthorized access attempt',
        )
        throw new Error('Unauthorized')
      }

      // 检查所有场景的资产是否都已完成
      console.log('[createStoryVideoComposition] 🔍 Checking scene assets...')
      const sceneAssets = await db
        .select()
        .from(t.animationAsset)
        .where(
          and(
            eq(t.animationAsset.storyId, storyId),
            eq(t.animationAsset.status, 'completed'),
          ),
        )

      // 按场景组织资产
      const assetsByScene = sceneAssets.reduce(
        (acc, asset) => {
          const sceneId = asset.sceneId
          if (!acc[sceneId]) {
            acc[sceneId] = { audio: null, image: null, whiteboard: null }
          }
          if (asset.assetType === 'audio') {
            acc[sceneId].audio = asset
          } else if (asset.assetType === 'image') {
            acc[sceneId].image = asset
          } else if (asset.assetType === 'whiteboard_animation') {
            acc[sceneId].whiteboard = asset
          }
          return acc
        },
        {} as Record<string, { audio: any; image: any; whiteboard: any }>,
      )

      console.log('[createStoryVideoComposition] 📊 Assets by scene:', {
        totalScenes: Object.keys(assetsByScene).length,
        requestedScenes: sceneIds.length,
      })

      // 验证所有请求的场景都有必要的资产
      const missingAssets = []
      for (const sceneId of sceneIds) {
        const sceneAsset = assetsByScene[sceneId]
        if (!sceneAsset?.audio) {
          missingAssets.push(`Scene ${sceneId}: missing audio`)
        }
        if (!sceneAsset?.whiteboard) {
          missingAssets.push(`Scene ${sceneId}: missing whiteboard animation`)
        }
      }

      if (missingAssets.length > 0) {
        console.error(
          '[createStoryVideoComposition] ❌ Missing assets:',
          missingAssets,
        )
        throw new Error(`Missing required assets: ${missingAssets.join(', ')}`)
      }

      // 创建合成任务
      const compositionTaskId = ulid()
      await getDatabase().insert(t.animationAsset).values({
        id: compositionTaskId,
        storyId,
        sceneId: 'composition', // 特殊标记表示这是合成任务
        assetType: 'video_composition',
        s3Url: '',
        s3Key: '',
        contentType: 'video/mp4',
        status: 'pending',
        metadata: {
          sceneIds,
          sceneAssets: assetsByScene,
          compositionType: 'story_video',
          totalScenes: sceneIds.length,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(
        '[createStoryVideoComposition] ✅ Composition task created:',
        {
          taskId: compositionTaskId,
          storyId,
          sceneCount: sceneIds.length,
        },
      )

      // TODO: 启动实际的视频合成任务
      // 这里可以调用视频合成服务

      return {
        taskId: compositionTaskId,
        status: 'pending',
        message: 'Video composition task created successfully',
        sceneCount: sceneIds.length,
      }
    } catch (error) {
      console.error(
        '[createStoryVideoComposition] 💥 Error creating composition:',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          input: { storyId, sceneIds },
          userId: context.session?.user?.id,
        },
      )
      throw error
    }
  })

const getVideoCompositionStatus = implement
  .input(
    z.object({
      taskId: z.string().describe('The video composition task ID'),
    }),
  )
  .handler(async ({ input, context }) => {
    const { taskId } = input

    console.log('[getVideoCompositionStatus] 🔍 Checking composition status:', {
      taskId,
      userId: context.session?.user?.id,
    })

    try {
      if (!context.session?.user?.id) {
        console.error(
          '[getVideoCompositionStatus] ❌ Unauthorized access attempt',
        )
        throw new Error('Unauthorized')
      }

      const compositionTask = await db
        .select()
        .from(t.animationAsset)
        .where(eq(t.animationAsset.id, taskId))
        .limit(1)

      if (!compositionTask[0]) {
        console.error(
          '[getVideoCompositionStatus] ❌ Composition task not found:',
          taskId,
        )
        throw new Error('Composition task not found')
      }

      if (compositionTask[0].assetType !== 'video_composition') {
        console.error(
          '[getVideoCompositionStatus] ❌ Task is not a video composition:',
          {
            taskId,
            assetType: compositionTask[0].assetType,
          },
        )
        throw new Error('Task is not a video composition')
      }

      // 如果任务状态已经完成或失败，直接返回数据库状态
      let currentTask = compositionTask[0]
      if (
        currentTask.status === 'completed' ||
        currentTask.status === 'failed'
      ) {
        console.log(
          '[getVideoCompositionStatus] ✅ Task already completed/failed, returning database state:',
          {
            taskId,
            status: currentTask.status,
          },
        )

        const result = {
          taskId: currentTask.id,
          status: currentTask.status,
          s3Url: currentTask.s3Url,
          s3Key: currentTask.s3Key,
          errorMessage: currentTask.errorMessage,
          metadata: currentTask.metadata,
          createdAt: currentTask.createdAt,
          updatedAt: currentTask.updatedAt,
        }

        return result
      }

      // 如果任务状态还未完成，且有外部任务ID，则查询最新状态
      if (
        (currentTask.status === 'pending' ||
          currentTask.status === 'processing') &&
        currentTask.metadata &&
        typeof currentTask.metadata === 'object' &&
        'externalTaskId' in currentTask.metadata
      ) {
        const externalTaskId = (currentTask.metadata as any).externalTaskId

        console.log(
          '[getVideoCompositionStatus] 🔍 Checking external task status:',
          { externalTaskId },
        )

        try {
          const externalStatus = await getTaskStatus({
            taskId: externalTaskId,
            baseUrl: 'https://api.a1d.ai',
          })

          console.log('[getVideoCompositionStatus] 📊 External task status:', {
            taskId: externalTaskId,
            status: externalStatus.status,
          })

          // 根据外部任务状态更新数据库
          let needsUpdate = false
          let newStatus: 'pending' | 'processing' | 'completed' | 'failed' =
            currentTask.status
          let newS3Url = currentTask.s3Url
          let newS3Key = currentTask.s3Key
          let newErrorMessage = currentTask.errorMessage

          if (externalStatus.status === 'FINISHED') {
            needsUpdate = true
            newStatus = 'completed'
            newS3Url = externalStatus.videoUrl
            newS3Key = `video-compositions/${taskId}.mp4`
            console.log(
              '[getVideoCompositionStatus] ✅ External task completed, updating database',
            )
          } else if (externalStatus.status === 'ERROR') {
            needsUpdate = true
            newStatus = 'failed'
            newErrorMessage = externalStatus.error
            console.log(
              '[getVideoCompositionStatus] ❌ External task failed, updating database',
            )
          } else if (
            (externalStatus.status === 'PROCESSING' ||
              externalStatus.status === 'WAITING') &&
            currentTask.status === 'pending'
          ) {
            needsUpdate = true
            newStatus = 'processing'
            console.log(
              '[getVideoCompositionStatus] 🔄 External task processing, updating database',
            )
          }

          if (needsUpdate) {
            const [updatedTask] = await db
              .update(t.animationAsset)
              .set({
                status: newStatus,
                s3Url: newS3Url,
                s3Key: newS3Key,
                errorMessage: newErrorMessage,
                updatedAt: new Date(),
              })
              .where(eq(t.animationAsset.id, taskId))
              .returning()

            if (updatedTask) {
              currentTask = updatedTask
              console.log(
                '[getVideoCompositionStatus] ✅ Database updated successfully',
                {
                  taskId,
                  newStatus,
                  hasVideoUrl: !!newS3Url,
                },
              )
            }
          }
        } catch (externalError) {
          console.error(
            '[getVideoCompositionStatus] ❌ Failed to check external task status:',
            {
              error:
                externalError instanceof Error
                  ? externalError.message
                  : 'Unknown error',
              externalTaskId,
            },
          )
          // 不抛出错误，继续返回当前数据库状态
        }
      }

      const result = {
        taskId: currentTask.id,
        status: currentTask.status,
        s3Url: currentTask.s3Url,
        s3Key: currentTask.s3Key,
        errorMessage: currentTask.errorMessage,
        metadata: currentTask.metadata,
        createdAt: currentTask.createdAt,
        updatedAt: currentTask.updatedAt,
      }

      console.log(
        '[getVideoCompositionStatus] ✅ Status retrieved successfully:',
        {
          taskId,
          status: result.status,
          hasS3Url: !!result.s3Url,
        },
      )

      return result
    } catch (error) {
      console.error(
        '[getVideoCompositionStatus] 💥 Error getting composition status:',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          taskId,
          userId: context.session?.user?.id,
        },
      )
      throw error
    }
  })

export const router = {
  updateProject,
  // getTask,
  getAnimationAsset,
  createWhiteboardAnimation,
  getWhiteboardAnimationStatus,
  createStoryVideoComposition,
  getVideoCompositionStatus,
}

export type Router = typeof router
