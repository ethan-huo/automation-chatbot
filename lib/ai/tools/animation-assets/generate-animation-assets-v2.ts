import type { Story } from '@/artifacts/story/schema'
import { getDocumentById } from '@/lib/db/queries'
import { tool } from 'ai'
import { z } from 'zod'

// 导入 mock 版本的类型定义以保持一致性
import { generateStoryAssetsAsync } from './tasks-async'

export type AnimationAssetTask = {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_url?: string
  image_url?: string
}

export type Shot = {
  shot_id: string
  narration_text: string
  audio_task: AnimationAssetTask
  image_tasks: AnimationAssetTask[] // Multiple image tasks for "card drawing" effect
}

export type Scene = {
  scene_id: string
  title: string
  shots: Shot[]
}

export type StoryAssets = Scene[]

export const generateAnimationAssetsV2 = tool({
  description:
    'Generate animation assets (audio and images) from story data using the new atomic task system',
  parameters: z.object({
    story_artifact_id: z
      .string()
      .describe('The ID of the story document to generate assets for'),
  }),
  execute: async ({ story_artifact_id }) => {
    console.log(`🎯 Starting asset generation for story: ${story_artifact_id}`)

    // 获取故事文档
    const document = await getDocumentById({ id: story_artifact_id })
    if (!document) {
      throw new Error(`Story artifact with id ${story_artifact_id} not found`)
    }

    if (document.kind !== 'story') {
      throw new Error(`Document ${story_artifact_id} is not a story artifact`)
    }

    if (!document.content) {
      throw new Error(`Story artifact ${story_artifact_id} has no content`)
    }

    // 解析故事内容
    let storyData: Story
    try {
      storyData = JSON.parse(document.content)
    } catch (error) {
      throw new Error(`Failed to parse story content: ${error}`)
    }

    console.log(
      `📚 Processing story: "${storyData.title}" with ${storyData.scenes.length} scenes`,
    )

    // 使用异步任务生成资产
    const result = await generateStoryAssetsAsync({
      storyId: story_artifact_id,
      scenes: storyData.scenes.map((scene) => ({
        scene_id: scene.scene_id,
        narration_text: scene.narration_text,
        visual_concept_prompt: scene.visual_concept_prompt,
      })),
      options: {
        imageOptions: {
          botType: 'MID_JOURNEY',
        },
      },
    })

    console.log(
      `✅ Asset generation tasks created: ${result.totalScenes} scenes with background processing`,
    )

    // 构建与 mock 版本一致的 StoryAssets 结构，使用真实的数据库任务ID
    const storyAssets: StoryAssets = storyData.scenes.map((scene) => {
      // 找到对应的任务结果
      const sceneResult = result.results.find(
        (r) => r.sceneId === scene.scene_id, // scene_id 现在已经是 string 了
      )

      if (!sceneResult) {
        throw new Error(`No task result found for scene ${scene.scene_id}`)
      }

      return {
        scene_id: scene.scene_id, // 已经是 string，不需要转换
        title: scene.title,
        shots: [
          {
            shot_id: '1', // 每个 Scene 的第一个 Shot 都是 '1' (string)
            narration_text: scene.narration_text,
            audio_task: {
              task_id: sceneResult.audioTaskId, // 使用真实的数据库任务ID (string)
              status: 'pending',
            },
            image_tasks: [
              {
                task_id: sceneResult.imageTaskId, // 使用真实的数据库任务ID (string)
                status: 'pending',
              },
            ],
          },
        ],
      }
    })

    return storyAssets
  },
})

// 导出异步任务函数供其他地方使用
export {
  generateAudioAsync,
  generateImageAsync,
  generateStoryAssetsAsync,
} from './tasks-async'
