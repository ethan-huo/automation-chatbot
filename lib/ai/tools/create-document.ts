import { inspect } from 'node:util'
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server'
import { generateUUID } from '@/lib/utils'
import { DataStreamWriter, tool } from 'ai'
import { Session } from 'next-auth'
import { z } from 'zod'

interface CreateDocumentProps {
  session: Session
  dataStream: DataStreamWriter
  chatId: string
}

export const createDocument = ({
  session,
  dataStream,
  chatId,
}: CreateDocumentProps) =>
  tool({
    description: `Create a docume't for a writing or content creation activities.
      This tool will call other functions that will generate the contents of the document based on the title and kind.`,
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
      instruction: z
        .string()
        .optional()
        .describe(
          'If necessary, send detailed requirements and context instructions to the downstream agent to help it have a clear goal and context when performing tasks.',
        ),
    }),
    execute: async ({ title, kind, instruction }) => {
      const id = generateUUID()

      dataStream.writeData({
        type: 'kind',
        content: kind,
      })

      dataStream.writeData({
        type: 'id',
        content: id,
      })

      dataStream.writeData({
        type: 'title',
        content: title,
      })

      dataStream.writeData({
        type: 'clear',
        content: '',
      })

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      )

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`)
      }

      console.log('[createDocument] start', { kind: documentHandler.kind })

      await documentHandler.onCreateDocument({
        id,
        title,
        chatId,
        dataStream,
        session,
      })

      console.log('[createDocument] finish', {
        id,
        title,
        kind,
      })
      dataStream.writeData({ type: 'finish', content: '' })

      const result = {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user. ',
      }

      return result
    },
  })
