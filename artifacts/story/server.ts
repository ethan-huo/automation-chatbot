import { myProvider } from '@/lib/ai/providers'
import { createDocumentHandler } from '@/lib/artifacts/server'
import { getDocumentsByChatIdAndKind } from '@/lib/db/queries'
import { concat, tag } from '@/lib/strings'
import { streamObject } from 'ai'
import { stringifyJSON5 } from 'confbox'

import { storySchema } from './schema'

export const storyDocumentHandler = createDocumentHandler<'story'>({
  kind: 'story',
  onCreateDocument: async ({ title, instruction, dataStream, chatId }) => {
    // find project
    const projects = await getDocumentsByChatIdAndKind({
      chatId,
      kind: 'project',
    })

    if (projects.length === 0) {
      return JSON.stringify({
        error: 'Project has not been created yet',
      })
    }
    if (projects.length > 1) {
      console.error('Multiple projects found', projects)
      return JSON.stringify({
        error: 'Multiple projects found',
      })
    }
    const project = projects[0]
    if (project.kind !== 'project') {
      return JSON.stringify({
        error: 'Project has not been created yet',
      })
    }

    let draftContent = ''

    const { partialObjectStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: `You are an expert whiteboard animation script writer. Create engaging, educational video scripts that are perfect for whiteboard animations.

Guidelines:
- Create compelling narratives that work well with visual storytelling
- Write conversational, clear narration that sounds natural when spoken
- Design visual concepts that are perfect for whiteboard-style illustrations
- Structure scenes to build a complete story arc
- Each scene should be 8-20 seconds long
- Visual prompts should be detailed and optimized for simple, clean illustrations
- Focus on educational content that engages the target audience`,
      prompt: concat(
        `Create a whiteboard animation script about: \`${title}\``,
        tag('instruction', instruction),
        tag('project', stringifyJSON5(project)),
      ),
      schema: storySchema,
    })

    for await (const partialObject of partialObjectStream) {
      draftContent = JSON.stringify(partialObject, null, 2)

      dataStream.writeData({
        type: 'story-delta',
        content: draftContent,
      })
    }

    return draftContent
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = ''

    const { partialObjectStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: `You are an expert whiteboard animation script writer. Update the existing script based on the user's requirements.

Guidelines:
- Maintain the overall story structure while incorporating requested changes
- Keep the conversational, clear narration style
- Ensure visual concepts remain suitable for whiteboard-style illustrations
- Preserve scene flow and timing unless specifically asked to change
- Update visual prompts to be detailed and optimized for simple, clean illustrations

Current script:
${document.content}`,
      prompt: `Update the script based on this request: ${description}`,
      schema: storySchema,
    })

    for await (const partialObject of partialObjectStream) {
      draftContent = JSON.stringify(partialObject, null, 2)

      dataStream.writeData({
        type: 'story-delta',
        content: draftContent,
      })
    }

    return draftContent
  },
})
