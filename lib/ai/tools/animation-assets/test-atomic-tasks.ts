import {
  generateAudioAsync,
  generateImageAsync,
  generateStoryAssetsAsync,
} from './tasks-async'

// 测试音频生成原子任务
export async function testAudioGeneration() {
  console.log('🎵 Testing audio generation...')

  try {
    const result = await generateAudioAsync({
      storyId: 'test-story-001',
      sceneId: '1',
      narrationText:
        'Hello, this is a test narration for our animation system.',
      voiceOptions: {
        voiceId: 'English_Persuasive_Man',
        speed: 1.0,
        volume: 1.0,
        pitch: 1.0,
      },
    })

    console.log('✅ Audio generation successful:', result)
    return result
  } catch (error) {
    console.error('❌ Audio generation failed:', error)
    throw error
  }
}

// 测试图片生成原子任务
export async function testImageGeneration() {
  console.log('🖼️ Testing image generation...')

  try {
    const result = await generateImageAsync({
      storyId: 'test-story-001',
      sceneId: '1',
      visualPrompt:
        'A rocket launching into space, minimalist line art style, hand-drawn illustration, centered composition, clean white background, simple black lines, dynamic upward movement',
      imageOptions: {
        botType: 'MID_JOURNEY',
      },
    })

    console.log('✅ Image generation successful:', result)
    return result
  } catch (error) {
    console.error('❌ Image generation failed:', error)
    throw error
  }
}

// 测试完整的 Story 资产生成
export async function testStoryAssetGeneration() {
  console.log('📚 Testing complete story asset generation...')

  const testStory = {
    storyId: 'test-story-002',
    scenes: [
      {
        scene_id: '1',
        narration_text: 'Welcome to our amazing product demonstration.',
        visual_concept_prompt:
          'A modern office setting with a computer screen showing a dashboard, minimalist style, clean lines, professional atmosphere',
      },
      {
        scene_id: '2',
        narration_text: 'Let me show you how easy it is to get started.',
        visual_concept_prompt:
          'Hands typing on a keyboard with floating UI elements around, modern illustration style, bright colors, user-friendly interface',
      },
    ],
    options: {
      audioOptions: {
        voiceId: 'English_Persuasive_Man',
        speed: 1.0,
      },
      imageOptions: {
        botType: 'MID_JOURNEY' as const,
      },
    },
  }

  try {
    const result = await generateStoryAssetsAsync(testStory)
    console.log('✅ Story asset generation completed:', result)
    return result
  } catch (error) {
    console.error('❌ Story asset generation failed:', error)
    throw error
  }
}

// 运行所有测试的主函数
export async function runAllTests() {
  console.log('🚀 Starting atomic task tests...')

  try {
    // 测试单个原子任务
    console.log('\n--- Testing Individual Atomic Tasks ---')
    await testAudioGeneration()
    await testImageGeneration()

    // 测试完整流程
    // console.log('\n--- Testing Complete Story Processing ---')
    // await testStoryAssetGeneration()

    console.log('\n🎉 All tests completed successfully!')
  } catch (error) {
    console.error('\n💥 Test suite failed:', error)
    throw error
  }
}

// 如果直接运行此文件，执行测试
runAllTests().catch(console.error)
