import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { streamText } from 'ai'
import { stringifyJSON5 } from 'confbox'

import {
  googleGenerativeAI,
  GoogleGenerativeAIModel,
} from './google-generative-ai'

const model = googleGenerativeAI(
  // GoogleGenerativeAIModel.GEMINI_2_5_PRO_PREVIEW_06_05,
  GoogleGenerativeAIModel.GEMINI_2_5_FLASH_PREVIEW_05_20,
)

const stream = streamText({
  model,
  prompt:
    'You are a helpful AI assistant. Please introduce yourself in Chinese and explain what you can help with.',
  providerOptions: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  } satisfies GoogleGenerativeAIProviderOptions,
})

// for await (const chunk of stream.fullStream) {
//   process.stdout.write(stringifyJSON5(chunk, { indent: 2 }))
// }

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk)
}
await stream.consumeStream()
console.log('\n\nbye')
