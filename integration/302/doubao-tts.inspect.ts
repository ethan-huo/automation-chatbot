import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

import {
  DoubaoTTSPresets,
  DoubaoTTSVoices,
  generateDoubaoTTS,
} from './doubao-tts'

async function testDoubaoTTS() {
  console.log('Testing Doubao TTS API...')

  // 确保 temp 目录存在
  const tempDir = './temp'
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }

  try {
    const result = await generateDoubaoTTS({
      text: '你好，这是一个测试语音合成的文本。让我们看看豆包TTS的效果如何。',
      voiceType: 'zh_male_M392_conversation_wvae_bigtts',
      encoding: 'mp3',
      speedRatio: 1.0,
      volumeRatio: 1.0,
      pitchRatio: 1.0,
    })

    console.log('API Response:', {
      success: result.success,
      error: result.error,
      reqId: result.reqId,
      duration: result.duration,
      sequence: result.sequence,
      audioBufferSize: result.audioBuffer?.byteLength,
    })

    if (result.success && result.audioBuffer) {
      const filename = `doubao_tts_test_${Date.now()}.mp3`
      const filepath = join(tempDir, filename)
      const buffer = Buffer.from(result.audioBuffer)
      writeFileSync(filepath, buffer)
      console.log(`Audio saved to: ${filepath}`)
      console.log(`Audio size: ${buffer.length} bytes`)

      // 显示音频文件的前20个字节
      console.log(
        'Audio buffer first 20 bytes:',
        Array.from(buffer.slice(0, 20))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' '),
      )
    } else {
      console.error('Failed to generate TTS:', result.error)
    }

    return result
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
}

// 测试不同的音色和预设
async function testDifferentVoices() {
  console.log('\n=== Testing Different Voices ===')

  const testCases = [
    { name: 'Male Voice', config: DoubaoTTSPresets.male },
    { name: 'Male Standard', config: DoubaoTTSPresets.maleStandard },
    { name: 'Female Voice', config: DoubaoTTSPresets.female },
    { name: 'Slow Voice', config: DoubaoTTSPresets.slow },
    { name: 'Fast Voice', config: DoubaoTTSPresets.fast },
  ]

  for (const testCase of testCases) {
    console.log(`\n--- Testing ${testCase.name} ---`)
    console.log('Voice Type:', testCase.config.voiceType)
    console.log('Voice Name:', DoubaoTTSVoices[testCase.config.voiceType])

    try {
      const result = await generateDoubaoTTS({
        text: `这是${testCase.name}的测试语音。`,
        ...testCase.config,
      })

      if (result.success && result.audioBuffer) {
        const filename = `doubao_tts_${testCase.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.mp3`
        const filepath = join('./temp', filename)
        writeFileSync(filepath, Buffer.from(result.audioBuffer))
        console.log(`✅ Success: ${filepath}`)
        console.log(
          `   Duration: ${result.duration}ms, Size: ${result.audioBuffer.byteLength} bytes`,
        )
      } else {
        console.log(`❌ Failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`❌ Error for ${testCase.name}:`, error)
    }
  }
}

// 测试参数验证
async function testParameterValidation() {
  console.log('\n=== Testing Parameter Validation ===')

  const invalidTests = [
    { name: 'Empty Text', request: { text: '' } },
    { name: 'Long Text', request: { text: 'a'.repeat(1025) } },
    { name: 'Invalid Speed', request: { text: '测试', speedRatio: 3.0 } },
    { name: 'Invalid Volume', request: { text: '测试', volumeRatio: 5.0 } },
    { name: 'Invalid Pitch', request: { text: '测试', pitchRatio: 2.0 } },
  ]

  for (const test of invalidTests) {
    console.log(`\n--- Testing ${test.name} ---`)
    try {
      const result = await generateDoubaoTTS(test.request as any)
      if (!result.success) {
        console.log(`✅ Correctly rejected: ${result.error}`)
      } else {
        console.log(`❌ Should have been rejected but succeeded`)
      }
    } catch (error) {
      console.log(`✅ Correctly threw error: ${error}`)
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  console.log('🚀 Starting Doubao TTS Tests...')

  testDoubaoTTS()
    .then(() => {
      console.log('\n✅ Basic test completed!')
      return testParameterValidation()
    })
    .then(() => {
      console.log('\n✅ Parameter validation tests completed!')
      return testDifferentVoices()
    })
    .then(() => {
      console.log('\n🎉 All tests completed successfully!')
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

export { testDoubaoTTS, testDifferentVoices, testParameterValidation }
