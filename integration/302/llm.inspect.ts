import { env } from '@/lib/env'
import { createOpenAI } from '@ai-sdk/openai'
import { jsonSchema, streamObject } from 'ai'
import { type } from 'arktype'

const model = createOpenAI({
  baseURL: 'https://api.302.ai/v1',
  apiKey: env.X_302_API_KEY,
})

const stream = streamObject({
  model: model('gpt-4.1'),
  schema: jsonSchema(
    // @ts-expect-error
    type({
      explain: 'string',
    }).toJsonSchema(),
  ),

  prompt: '解释量子比特',
})

for await (const chunk of stream.partialObjectStream) {
  process.stdout.write(JSON.stringify(chunk, null, 2))
}
