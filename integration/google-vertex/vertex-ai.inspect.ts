import { env } from '@/lib/env'
import { GoogleGenAI } from '@google/genai'
import { streamText } from 'ai'

import {
  googleGenerativeAI,
  googleProviderOptions,
} from '../google-generative-ai'
import { openrouter, OpenrouterModel } from '../openrouter'
import { VertexModel } from './models'

/**
 * https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal?hl=zh-cn#gemini-text-only-samples-nodejs_genai_sdk
 */
async function testGeminiVertex() {
  const genai = new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT_ID,
    location: env.GOOGLE_CLOUD_LOCALTION,
  })

  const response = await genai.models.generateContentStream({
    model: VertexModel.GEMINI_2_5_FLASH_PREVIEW_05_20,
    config: {
      thinkingConfig: {
        thinkingBudget: 2048,
        includeThoughts: true,
      },
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: '宇宙的尽头是什么？',
          },
        ],
      },
    ],
  })

  let thoughts = ''
  let answer = ''
  for await (const chunk of response) {
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (!part.text) {
        continue
      } else if (part.thought) {
        if (!thoughts) {
          console.log('Thoughts summary:')
        }

        process.stdout.write(part.text)
        thoughts = thoughts + part.text
      } else {
        if (!answer) {
          console.log('Answer:')
        }
        process.stdout.write(part.text)
        answer = answer + part.text
      }
    }
  }
}

async function testGeminiOpenrouter() {
  const result = streamText({
    model: openrouter(OpenrouterModel.GOOGLE_GEMINI_2_5_FLASH),
    prompt: '宇宙的尽头是什么？',
    providerOptions: googleProviderOptions({
      thinkingConfig: {
        thinkingBudget: 2048,
        includeThoughts: true,
      },
    }),
  })

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'reasoning') {
      process.stdout.write(chunk.textDelta)
    } else if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.textDelta)
    }
  }

  await result.consumeStream()
}

await testGeminiVertex()
console.log('--------------------------------')
await testGeminiOpenrouter()
