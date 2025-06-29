import { myProvider } from '@/lib/ai/providers'
import { createDocumentHandler } from '@/lib/artifacts/server'
import { concat, tag } from '@/lib/strings'
import { streamObject } from 'ai'

import { projectSchema } from './schema'

const projectPrompt = `You are a whiteboard animation project generator. Based on the user's requirements, create a comprehensive project configuration for a whiteboard animation video.

Guidelines:
- Analyze the user's request to understand their goals, target audience, and preferences
- Generate appropriate values for all required fields
- Ensure the configuration is coherent and suitable for the intended purpose
- Use professional judgment to fill in details that weren't explicitly specified
- The output should be a complete project configuration ready for animation production

Focus on creating engaging, clear, and effective whiteboard animation projects.`

const updateProjectPrompt = (currentContent: string, kind: string) => `
You are updating a whiteboard animation project configuration.

Current project configuration:
${currentContent}

Based on the user's update request, modify the project configuration appropriately. Maintain consistency with existing settings unless specifically asked to change them.

Guidelines:
- Only update the fields that are relevant to the user's request
- Preserve existing settings that aren't being changed
- Ensure all changes maintain project coherence
- Validate that the updated configuration is complete and valid
`

export const projectDocumentHandler = createDocumentHandler<'project'>({
  kind: 'project',
  onCreateDocument: async ({
    title,
    instruction,
    dataStream,
    chatId,
    session,
  }) => {
    console.log('[createProject] start', { title })

    let draftContent = ''

    const prompt = concat(tag('title', title), tag('instruction', instruction))

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: projectPrompt,
      prompt,
      schema: projectSchema,
    })

    console.log('[createProject] stream created')

    for await (const delta of fullStream) {
      const { type } = delta

      if (type === 'object') {
        const { object } = delta

        if (object) {
          const projectJson = JSON.stringify(object, null, 2)

          if (process.env.NODE_ENV === 'development') {
            console.log(
              '[createProject] projectJson',
              projectJson.slice(0, 80) + '...',
            )
          }

          dataStream.writeData({
            type: 'project-delta',
            content: projectJson,
          })

          draftContent = projectJson
        }
      }
    }

    console.log('[createProject] stream finished')

    return draftContent
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = ''

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateProjectPrompt(document.content || '', 'project'),
      prompt: description,
      schema: projectSchema,
    })

    for await (const delta of fullStream) {
      const { type } = delta

      if (type === 'object') {
        const { object } = delta

        if (object) {
          const projectJson = JSON.stringify(object, null, 2)

          dataStream.writeData({
            type: 'project-delta',
            content: projectJson,
          })

          draftContent = projectJson
        }
      }
    }

    return draftContent
  },
})
