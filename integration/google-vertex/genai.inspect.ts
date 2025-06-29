import { env } from '@/lib/env'
import { GoogleGenAI } from '@google/genai'

const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY, // 使用API Key而不是project/location
})

async function testGemini() {
  const result1 = await gemini.models.generateContentStream({
    model: 'gemini-2.5-flash-lite-preview-06-17',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: '我们可以成为朋友吗? ',
          },
        ],
      },
    ],
    config: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  })

  for await (const part of result1) {
    process.stdout.write(part.text ?? '')
  }

  const result2 = await gemini.models.generateContentStream({
    model: 'gemini-2.5-flash-lite-preview-06-17',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: '我们可以成为朋友吗? ',
          },
        ],
      },
    ],
    config: {
      thinkingConfig: {
        thinkingBudget: 512,
      },
    },
  })

  for await (const part of result2) {
    process.stdout.write(part.text ?? '')
  }
}

// BTC价格查询（也使用googleSearch）
async function generateBTCPrice() {
  const response = await gemini.models.generateContent({
    model: 'gemini-2.5-flash-lite-preview-06-17',
    contents: [
      {
        role: 'user',
        parts: [{ text: 'BTC 最新的价格是多少？' }],
      },
    ],
    config: {
      tools: [
        {
          googleSearch: {}, // 同样使用基础的googleSearch
        },
      ],
    },
  })

  // 打印grounding信息
  const candidate = response.candidates?.[0]
  if (candidate?.groundingMetadata) {
    console.log(
      '搜索查询:',
      candidate.groundingMetadata.retrievalQueries || '未提供',
    )
    console.log('引用来源:')
    candidate.groundingMetadata.groundingChunks?.forEach((chunk, index) => {
      if (chunk.web) {
        console.log(
          `  ${index + 1}. ${chunk.web.title || '未知标题'} - ${chunk.web.domain || '未知域名'}`,
        )
        console.log(`     ${chunk.web.uri || '无链接'}`)
      }
    })
  }

  console.log(response.candidates?.[0]?.content?.parts?.[0]?.text)
}

// testGemini().catch(console.error)
generateBTCPrice().catch(console.error)
