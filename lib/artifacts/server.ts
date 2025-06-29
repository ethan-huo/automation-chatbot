import { codeDocumentHandler } from '@/artifacts/code/server'
import { imageDocumentHandler } from '@/artifacts/image/server'
import { projectDocumentHandler } from '@/artifacts/project/server'
import { sheetDocumentHandler } from '@/artifacts/sheet/server'
import { storyDocumentHandler } from '@/artifacts/story/server'
import { textDocumentHandler } from '@/artifacts/text/server'
import { ArtifactKind } from '@/components/artifact'
import { DataStreamWriter } from 'ai'
import { Session } from 'next-auth'

import { saveDocument } from '../db/queries'
import { Document } from '../db/schema'

export interface SaveDocumentProps {
  id: string
  title: string
  kind: ArtifactKind
  content: string
  userId: string
}

export interface CreateDocumentCallbackProps {
  id: string
  chatId: string
  title: string
  instruction?: string
  dataStream: DataStreamWriter
  session: Session
}

export interface UpdateDocumentCallbackProps {
  document: Document
  description: string
  dataStream: DataStreamWriter
  session: Session
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      console.log('[onCreateDocument] start', {
        id: args.id,
        title: args.title,
        kind: config.kind,
      })

      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        chatId: args.chatId,
        dataStream: args.dataStream,
        session: args.session,
      })

      console.log(
        '[onCreateDocument] draftContent',
        draftContent.slice(0, 80) + '...',
      )

      if (args.session?.user?.id) {
        console.log('[onCreateDocument] saving', {
          id: args.id,
          title: args.title,
          chatId: args.chatId,
          kind: config.kind,
        })

        await saveDocument({
          id: args.id,
          title: args.title,
          chatId: args.chatId,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        })

        console.log('[onCreateDocument] saved', {
          id: args.id,
          title: args.title,
          kind: config.kind,
        })
      }

      return
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      console.log('[onUpdateDocument] start', {
        id: args.document.id,
        title: args.document.title,
        kind: config.kind,
      })

      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      })

      console.log('[onUpdateDocument] finish', {
        id: args.document.id,
        title: args.document.title,
        kind: config.kind,
      })

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          chatId: args.document.chatId,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        })

        console.log('[onUpdateDocument] saved', {
          id: args.document.id,
          title: args.document.title,
          kind: config.kind,
        })
      }

      return
    },
  }
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
  projectDocumentHandler,
  storyDocumentHandler,
]

export const artifactKinds = [
  'text',
  'code',
  'image',
  'sheet',
  'project',
  'story',
] as const
