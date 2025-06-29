import { sceneSchema } from '@/artifacts/story/schema'
import { tool } from 'ai'
import { z } from 'zod'

export type AnimationTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export type AnimationTask = {
  task_id: string
  status: AnimationTaskStatus
  created_at: string
  updated_at: string
  progress: number
  scenes: Array<{
    scene_id: number
    audio_url?: string
    image_url?: string
    audio_status: AnimationTaskStatus
    image_status: AnimationTaskStatus
  }>
  error_message?: string
}

// Mock data for demonstration
const mockTasks: Record<string, AnimationTask> = {}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function simulateAsyncProcessing(taskId: string) {
  // Simulate processing with delays
  setTimeout(() => {
    const task = mockTasks[taskId]
    if (!task) return

    // Update to processing
    task.status = 'processing'
    task.progress = 25
    task.updated_at = new Date().toISOString()

    // Simulate audio generation completion
    setTimeout(() => {
      task.scenes.forEach((scene) => {
        scene.audio_status = 'completed'
        scene.audio_url = `https://mock-audio-cdn.com/audio_scene_${scene.scene_id}_${taskId}.mp3`
      })
      task.progress = 60
      task.updated_at = new Date().toISOString()

      // Simulate image generation completion
      setTimeout(() => {
        task.scenes.forEach((scene) => {
          scene.image_status = 'completed'
          scene.image_url = `https://mock-image-cdn.com/image_scene_${scene.scene_id}_${taskId}.png`
        })
        task.status = 'completed'
        task.progress = 100
        task.updated_at = new Date().toISOString()
      }, 3000) // Images take 3 more seconds
    }, 2000) // Audio takes 2 seconds
  }, 1000) // Initial delay of 1 second
}

export const generateWhiteboardAnimation = tool({
  description:
    'Generate whiteboard animation content (audio narration and visual illustrations) from story scenes. This creates a long-running task that processes each scene to generate audio files and illustration images.',
  parameters: z.object({
    scenes: z
      .array(sceneSchema)
      .describe(
        'Array of scenes from the story script to generate animation content for',
      ),
    voice_settings: z
      .object({
        voice_id: z
          .string()
          .default('default')
          .describe('Voice ID for narration'),
        speed: z
          .number()
          .min(0.5)
          .max(2.0)
          .default(1.0)
          .describe('Speech speed multiplier'),
        pitch: z
          .number()
          .min(-20)
          .max(20)
          .default(0)
          .describe('Voice pitch adjustment'),
      })
      .optional()
      .describe('Voice generation settings'),
    image_settings: z
      .object({
        style: z
          .enum(['whiteboard', 'hand-drawn', 'minimalist', 'sketch'])
          .default('whiteboard')
          .describe('Visual style for illustrations'),
        background: z
          .enum(['white', 'grid', 'notebook'])
          .default('white')
          .describe('Background style'),
        color_scheme: z
          .enum(['monochrome', 'blue-accent', 'colorful'])
          .default('monochrome')
          .describe('Color scheme for illustrations'),
      })
      .optional()
      .describe('Image generation settings'),
  }),
  execute: async ({ scenes, voice_settings, image_settings }) => {
    const taskId = generateTaskId()
    const now = new Date().toISOString()

    // Create initial task
    const task: AnimationTask = {
      task_id: taskId,
      status: 'pending',
      created_at: now,
      updated_at: now,
      progress: 0,
      scenes: scenes.map((scene) => ({
        scene_id: scene.scene_id,
        audio_status: 'pending',
        image_status: 'pending',
      })),
    }

    // Store task in mock storage
    mockTasks[taskId] = task

    // Start async processing
    simulateAsyncProcessing(taskId)

    return {
      task_id: taskId,
      status: 'pending',
      message: `Started generating whiteboard animation for ${scenes.length} scenes. Use the task ID to check progress.`,
      estimated_completion_time: `${scenes.length * 2} minutes`,
      scenes_count: scenes.length,
      voice_settings: voice_settings || {
        voice_id: 'default',
        speed: 1.0,
        pitch: 0,
      },
      image_settings: image_settings || {
        style: 'whiteboard',
        background: 'white',
        color_scheme: 'monochrome',
      },
    }
  },
})

export const checkAnimationTask = tool({
  description: 'Check the status of a whiteboard animation generation task',
  parameters: z.object({
    task_id: z
      .string()
      .describe('The task ID returned from generateWhiteboardAnimation'),
  }),
  execute: async ({ task_id }) => {
    const task = mockTasks[task_id]

    if (!task) {
      return {
        error: 'Task not found',
        task_id,
      }
    }

    return {
      task_id: task.task_id,
      status: task.status,
      progress: task.progress,
      created_at: task.created_at,
      updated_at: task.updated_at,
      scenes: task.scenes,
      error_message: task.error_message,
    }
  },
})
