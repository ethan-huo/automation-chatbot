import { codePrompt, updateDocumentPrompt } from '@/lib/ai/prompts'
import { myProvider } from '@/lib/ai/providers'
import { createDocumentHandler } from '@/lib/artifacts/server'
import { concat, tag } from '@/lib/strings'
import { streamObject } from 'ai'
import { z } from 'zod'

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, instruction, dataStream }) => {
    let draftContent = ''

    const prompt = concat(tag('title', title), tag('instruction', instruction))

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: codePrompt,
      prompt,
      schema: z.object({
        code: z.string(),
      }),
    })

    for await (const delta of fullStream) {
      const { type } = delta

      if (type === 'object') {
        const { object } = delta
        const { code } = object

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? '',
          })

          draftContent = code
        }
      }
    }

    return draftContent
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = ''

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'code'),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    })

    for await (const delta of fullStream) {
      const { type } = delta

      if (type === 'object') {
        const { object } = delta
        const { code } = object

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? '',
          })

          draftContent = code
        }
      }
    }

    return draftContent
  },
})
