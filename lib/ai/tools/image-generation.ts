import { imagine, watch } from '@/integration/302/midjourney'
import { put } from '@/lib/blob'
import { env } from '@/lib/env'
import { splitImageToQuadrantArray } from '@/lib/image'
import { invariant } from '@/lib/invariant'
import { nanoid } from 'nanoid'
import { firstValueFrom, lastValueFrom } from 'rxjs'

export type ImageGenerationOptions = {
  botType?: 'MID_JOURNEY' | 'NIJI_JOURNEY'
  style?: string
}

export type ImageGenerationResult = {
  success: boolean
  assetIds?: string[]
  s3Urls?: string[]
  s3Keys?: string[]
  taskId?: string
  error?: string
}

/**
 * Generate images from prompt using Midjourney API and upload to S3
 */
export async function generateAndUploadImages({
  prompt,
  storyId,
  sceneId,
  options = {},
}: {
  prompt: string
  storyId: string
  sceneId: string
  options?: ImageGenerationOptions
}): Promise<ImageGenerationResult> {
  try {
    const context = {
      apiSecret: env.X_302_API_KEY,
    }

    // Submit imagine request
    console.log('[generateAndUploadImages] submitting imagine request:', prompt)
    const imagineResult = await firstValueFrom(
      imagine(
        {
          botType: options.botType || 'MID_JOURNEY',
          prompt,
        },
        context,
      ),
    )

    if (imagineResult.code !== 1) {
      return {
        success: false,
        error: `Midjourney API error: ${imagineResult.description}`,
      }
    }

    const taskId = imagineResult.result
    invariant(taskId, 'taskId is required')
    console.log('[generateAndUploadImages] task submitted, taskId:', taskId)

    // Watch task progress until completion
    console.log('[generateAndUploadImages] watching task progress...')
    const watchResult = await lastValueFrom(
      watch({ taskId, interval: 5000 }, context),
    )

    if (watchResult.status !== 'SUCCESS') {
      return {
        success: false,
        error: `Image generation failed: ${watchResult.failReason || 'Unknown error'}`,
        taskId,
      }
    }

    console.log(
      '[generateAndUploadImages] task completed, downloading image...',
    )
    invariant(watchResult.imageUrl, 'imageUrl is required')
    // Download the generated image (Midjourney 4-grid)
    const imageResponse = await fetch(watchResult.imageUrl)
    if (!imageResponse.ok) {
      return {
        success: false,
        error: `Failed to download generated image: ${imageResponse.statusText}`,
        taskId,
      }
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const imageBuffer = Buffer.from(imageArrayBuffer)

    console.log('[generateAndUploadImages] splitting image into quadrants...')

    // Split the 4-grid image into individual images
    const quadrantBuffers = await splitImageToQuadrantArray(imageBuffer)

    console.log('[generateAndUploadImages] uploading individual images...')

    // Upload each quadrant to S3
    const uploadPromises = quadrantBuffers.map(async (buffer, index) => {
      const filename = `images/story-${storyId}/scene-${sceneId}-${index + 1}-${nanoid(8)}.png`
      return put(filename, buffer, {
        contentType: 'image/png',
        access: 'public',
        addRandomSuffix: false,
      })
    })

    const uploadResults = await Promise.all(uploadPromises)

    return {
      success: true,
      s3Urls: uploadResults.map((result) => result.url),
      s3Keys: uploadResults.map((result) => result.pathname),
      taskId,
    }
  } catch (error) {
    console.error('Failed to generate and upload images:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate images for multiple scenes in parallel
 */
export async function generateImagesForScenes({
  scenes,
  storyId,
  options = {},
}: {
  scenes: Array<{ scene_id: number; visual_concept_prompt: string }>
  storyId: string
  options?: ImageGenerationOptions
}): Promise<Array<ImageGenerationResult & { sceneId: string }>> {
  // Process scenes sequentially to avoid overwhelming the API
  const results: Array<ImageGenerationResult & { sceneId: string }> = []

  for (const scene of scenes) {
    console.log(`[generateImagesForScenes] processing scene ${scene.scene_id}`)

    const result = await generateAndUploadImages({
      prompt: scene.visual_concept_prompt,
      storyId,
      sceneId: scene.scene_id.toString(),
      options,
    })

    results.push({
      ...result,
      sceneId: scene.scene_id.toString(),
    })

    // Add delay between requests to be respectful to the API
    if (scenes.indexOf(scene) < scenes.length - 1) {
      console.log('[generateImagesForScenes] waiting before next request...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return results
}
