import type { DoubaoTTSVoiceType } from '@/integration/302/doubao-tts'
import { generateDoubaoTTS } from '@/integration/302/doubao-tts'
import { put } from '@/lib/blob'
import { nanoid } from 'nanoid'

export type AudioGenerationOptions = {
  voiceType?: DoubaoTTSVoiceType
  speedRatio?: number
  volumeRatio?: number
  pitchRatio?: number
}

export type AudioGenerationResult = {
  success: boolean
  assetId?: string
  s3Url?: string
  s3Key?: string
  duration?: number
  error?: string
}

/**
 * Generate audio from text using Doubao TTS and upload to S3
 */
export async function generateAndUploadAudio({
  text,
  storyId,
  sceneId,
  options = {},
}: {
  text: string
  storyId: string
  sceneId: string
  options?: AudioGenerationOptions
}): Promise<AudioGenerationResult> {
  try {
    // Generate audio using Doubao TTS
    const ttsResponse = await generateDoubaoTTS({
      text,
      voiceType: options.voiceType || 'zh_male_M392_conversation_wvae_bigtts',
      speedRatio: options.speedRatio || 1.0,
      volumeRatio: options.volumeRatio || 1.0,
      pitchRatio: options.pitchRatio || 1.0,
      encoding: 'mp3',
    })

    if (!ttsResponse.success || !ttsResponse.audioBuffer) {
      return {
        success: false,
        error: ttsResponse.error || 'Failed to generate audio',
      }
    }

    // Generate unique filename
    const filename = `audio/story-${storyId}/scene-${sceneId}-${nanoid(8)}.mp3`

    // Upload to S3
    const uploadResult = await put(filename, ttsResponse.audioBuffer, {
      contentType: 'audio/mpeg',
      access: 'public',
      addRandomSuffix: false,
    })

    return {
      success: true,
      s3Url: uploadResult.url,
      s3Key: uploadResult.pathname,
      duration: ttsResponse.duration,
    }
  } catch (error) {
    console.error('Failed to generate and upload audio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate audio for multiple scenes in parallel
 */
export async function generateAudioForScenes({
  scenes,
  storyId,
  options = {},
}: {
  scenes: Array<{ scene_id: number; narration_text: string }>
  storyId: string
  options?: AudioGenerationOptions
}): Promise<Array<AudioGenerationResult & { sceneId: string }>> {
  const promises = scenes.map(async (scene) => {
    const result = await generateAndUploadAudio({
      text: scene.narration_text,
      storyId,
      sceneId: scene.scene_id.toString(),
      options,
    })

    return {
      ...result,
      sceneId: scene.scene_id.toString(),
    }
  })

  return Promise.all(promises)
}
