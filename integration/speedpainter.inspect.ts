import { inspect } from 'node:util'

import type { GenerateRequest } from './speedpainter'
import {
  createSpeedPainterTask,
  DEFAULT_CANVAS_TITLE,
  DEFAULT_HAND_TITLE,
  getTaskStatus,
  getTaskStatusStream,
} from './speedpainter'

const baseUrl = 'https://api.a1d.ai'

export const testImages = [
  'https://api-prod-storage.a1d.ai/uploads/sp/--8qsqQ0D0EA9wSqy5UHk_1745342434711_speedpainter-1745342433296.jpeg',
  'https://api-prod-storage.a1d.ai/uploads/sp/-045a9Gz7onY2VaTK7qre_1749955096438_speedpainter-1749955106461.jpeg',
]

async function testSpeedPainter(testCase: {
  name: string
  imageUrl: string
  imageMimeType?: string
  options?: Partial<Omit<GenerateRequest, 'baseUrl' | 'imageUrl' | 'mimeType'>>
}): Promise<void> {
  console.log(`\n🧪 Testing: ${testCase.name}`)
  console.log(`📸 Image URL: ${testCase.imageUrl}`)

  try {
    const defaultOptions: Omit<
      GenerateRequest,
      'baseUrl' | 'imageUrl' | 'mimeType'
    > = {
      source: 'api',
      canvasTitle: DEFAULT_CANVAS_TITLE,
      colorFillDuration: 0,
      fps: 24,
      handTitle: DEFAULT_HAND_TITLE,
      needCanvas: false,
      needHand: false,
      needFadeout: false,
      sketchDuration: 1,
    }

    const request: GenerateRequest = {
      baseUrl,
      imageUrl: testCase.imageUrl,
      mimeType: testCase.imageMimeType || 'image/jpeg',
      ...defaultOptions,
      ...testCase.options,
    }

    console.log('⏳ Creating task...')
    const task = await createSpeedPainterTask(request)
    console.log(`✅ Task created: ${task.taskId}`)

    console.log('📡 Monitoring task status...')
    const stream = getTaskStatusStream({
      app: 'sp',
      baseUrl,
      taskId: task.taskId,
    })

    for await (const status of stream) {
      console.log(`📊 Status: ${status.status}`, status)

      if (status.status === 'FINISHED') {
        console.log('🎉 Task completed successfully!')
        console.log(`🎬 Video URL: ${status.videoUrl}`)
        console.log(`🖼️  Sketch URL: ${status.sketchImageUrl}`)
        break
      } else if (status.status === 'ERROR') {
        console.log('❌ Task failed:', status.error)
        break
      }
    }
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Test cases
async function runTests(): Promise<void> {
  console.log('🚀 Starting SpeedPainter integration tests...')

  // Test case 1: Basic test with URL
  // await testSpeedPainter({
  //   name: 'Basic sketch generation with URL',
  //   imageUrl: testImages[0],
  //   imageMimeType: 'image/jpeg',
  // })

  // Uncomment to test more cases:

  // // Test case 2: With color fill
  // await testSpeedPainter({
  //   name: 'Sketch with color fill',
  //   imageUrl: 'https://api-prod-storage.a1d.ai/uploads/sp/--8qsqQ0D0EA9wSqy5UHk_1745342434711_speedpainter-1745342433296.jpeg',
  //   imageMimeType: 'image/jpeg',
  //   options: {
  //     isFillWithColor: true,
  //     colorFillDuration: 2
  //   }
  // })

  // // Test case 3: Different settings
  // await testSpeedPainter({
  //   name: 'Custom settings',
  //   imageUrl: 'https://api-prod-storage.a1d.ai/uploads/sp/--8qsqQ0D0EA9wSqy5UHk_1745342433296.jpeg',
  //   imageMimeType: 'image/jpeg',
  //   options: {
  //     sketchDuration: 3,
  //     fps: 30,
  //     needFadeout: true
  //   }
  // })

  const taskId = '3qFvJ7h60X-_6qZDTlA9d'
  const status = await getTaskStatus({
    baseUrl,
    taskId,
  })

  console.log(inspect(status, { depth: null }))
}

// Run the tests
runTests().catch(console.error)
