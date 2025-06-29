import type { Story } from '@/artifacts/story/schema'
import type { AnimationAsset } from '@/lib/db/schema'

// 音频生成输入参数
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

// 图片生成输入参数
export type GenerateImageAssetInput = {
  storyId: string
  sceneId: string
  visualPrompt: string
  imageOptions?: {
    botType?: 'MID_JOURNEY' | 'NIJI_JOURNEY'
  }
}

// 原子任务结果
export type AssetGenerationResult = {
  assetId: string
  s3Url: string
  s3Key: string
  status: 'completed' | 'failed'
  error?: string
  metadata?: Record<string, unknown>
}

// 音频资产结果
export type AudioAssetResult = AssetGenerationResult & {
  duration?: number
  fileSize?: number
  audioFormat?: 'mp3' | 'wav'
}

// 图片资产结果
export type ImageAssetResult = AssetGenerationResult & {
  imageWidth?: number
  imageHeight?: number
  allImages?: string[] // 存储所有生成的图片 URL
  midjourneyTaskId?: string
}

// 任务进度状态
export type TaskProgress = {
  assetId: string
  status: AnimationAsset['status']
  progress?: string
  message?: string
}

// S3 上传结果
export type S3UploadResult = {
  url: string
  key: string
  bucket: string
  size?: number
}

// 场景处理输入
export type SceneProcessingInput = {
  scene: Story['scenes'][0]
  storyId: string
  audioOptions?: GenerateAudioAssetInput['voiceOptions']
  imageOptions?: GenerateImageAssetInput['imageOptions']
}

// 批量处理结果
export type BatchProcessingResult = {
  storyId: string
  totalScenes: number
  completedScenes: number
  failedScenes: number
  results: Array<{
    sceneId: string
    audioResult?: AudioAssetResult
    imageResult?: ImageAssetResult
    errors?: string[]
  }>
}
