'use client'

import type { Project } from '@/artifacts/project/schema'
import type { Story } from '@/artifacts/story/schema'
import { useArtifact } from '@/hooks/use-artifact'
import { Document } from '@/lib/db/schema'
import { cn, fetcher } from '@/lib/utils'
import equal from 'fast-deep-equal'
import {
  memo,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import useSWR from 'swr'

import { ArtifactKind, UIArtifact } from './artifact'
import { CodeEditor } from './code-editor'
import { DocumentToolCall, DocumentToolResult } from './document'
import { InlineDocumentSkeleton } from './document-skeleton'
import {
  FileIcon,
  FullscreenIcon,
  ImageIcon,
  LoaderIcon,
  PenIcon,
  PlayIcon,
} from './icons'
import { ImageEditor } from './image-editor'
import { Markdown } from './markdown'
import { SpreadsheetEditor } from './sheet-editor'
import { Editor } from './text-editor'

const generateProjectPreview = (content: string): string => {
  try {
    const project: Project = JSON.parse(content)

    return `# ${project.topic}

**Target Audience:** ${project.targetAudience}

**Duration:** ${project.desiredDurationInSeconds} seconds

**Tone:** ${project.tone}

**Call to Action:** ${project.callToAction}

## Visual Settings
- **Aspect Ratio:** ${project.aspectRatio}
- **Visual Style:** ${project.visualStyle}
- **Line Style:** ${project.lineStyle}
- **Color Scheme:** ${project.colorScheme}
- **Background:** ${project.backgroundStyle}`
  } catch (error) {
    return `# Whiteboard Animation Project

*Project configuration is being generated...*`
  }
}

const generateStoryPreview = (content: string): string => {
  try {
    const script: Story = JSON.parse(content)
    const totalDuration = script.scenes.reduce(
      (sum, scene) => sum + scene.scene_duration,
      0,
    )

    return `# ${script.title}

**Script ID:** ${script.script_id}
**Total Duration:** ${totalDuration} seconds
**Scenes:** ${script.scenes.length}

## Preview
${script.scenes
  .slice(0, 2)
  .map(
    (scene) =>
      `**Scene ${scene.scene_id}** (${scene.scene_duration}s): ${scene.narration_text.substring(0, 100)}${scene.narration_text.length > 100 ? '...' : ''}`,
  )
  .join('\n\n')}

${script.scenes.length > 2 ? `*...and ${script.scenes.length - 2} more scenes*` : ''}`
  } catch (error) {
    return `# Whiteboard Animation Script

*Script is being generated...*`
  }
}

interface DocumentPreviewProps {
  isReadonly: boolean
  result?: any
  args?: any
}

export function DocumentPreview({
  isReadonly,
  result,
  args,
}: DocumentPreviewProps) {
  const { artifact, setArtifact } = useArtifact()

  const { data: documents, isLoading: isDocumentsFetching } = useSWR<
    Array<Document>
  >(result ? `/api/document?id=${result.id}` : null, fetcher)

  const previewDocument = useMemo(() => documents?.[0], [documents])
  const hitboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect()

    if (artifact.documentId && boundingBox) {
      setArtifact((artifact) => ({
        ...artifact,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }))
    }
  }, [artifact.documentId, setArtifact])

  if (artifact.isVisible) {
    if (result) {
      return (
        <DocumentToolResult
          type="create"
          result={{ id: result.id, title: result.title, kind: result.kind }}
          isReadonly={isReadonly}
        />
      )
    }

    if (args) {
      return (
        <DocumentToolCall
          type="create"
          args={{ title: args.title }}
          isReadonly={isReadonly}
        />
      )
    }
  }

  if (isDocumentsFetching) {
    return <LoadingSkeleton artifactKind={result.kind ?? args.kind} />
  }

  const document: Document | null = previewDocument
    ? previewDocument
    : artifact.status === 'streaming'
      ? {
          title: artifact.title,
          kind: artifact.kind,
          content: artifact.content,
          id: artifact.documentId,
          createdAt: new Date(),
          userId: 'noop',
        }
      : null

  if (!document) return <LoadingSkeleton artifactKind={artifact.kind} />

  return (
    <div className="relative w-full cursor-pointer">
      <HitboxLayer
        hitboxRef={hitboxRef}
        result={result}
        setArtifact={setArtifact}
      />
      <DocumentHeader
        title={document.title}
        kind={document.kind}
        isStreaming={artifact.status === 'streaming'}
      />
      <DocumentContent document={document} />
    </div>
  )
}

const LoadingSkeleton = ({ artifactKind }: { artifactKind: ArtifactKind }) => (
  <div className="w-full">
    <div className="dark:bg-muted flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700">
      <div className="flex flex-row items-center gap-3">
        <div className="text-muted-foreground">
          <div className="bg-muted-foreground/20 size-4 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted-foreground/20 h-4 w-24 animate-pulse rounded-lg" />
      </div>
      <div>
        <FullscreenIcon />
      </div>
    </div>
    {artifactKind === 'image' ? (
      <div className="bg-muted overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700">
        <div className="bg-muted-foreground/20 h-[257px] w-full animate-pulse" />
      </div>
    ) : (
      <div className="bg-muted overflow-y-scroll rounded-b-2xl border border-t-0 p-8 pt-4 dark:border-zinc-700">
        <InlineDocumentSkeleton />
      </div>
    )}
  </div>
)

const PureHitboxLayer = ({
  hitboxRef,
  result,
  setArtifact,
}: {
  hitboxRef: React.RefObject<HTMLDivElement>
  result: any
  setArtifact: (
    updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact),
  ) => void
}) => {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const boundingBox = event.currentTarget.getBoundingClientRect()

      setArtifact((artifact) =>
        artifact.status === 'streaming'
          ? { ...artifact, isVisible: true }
          : {
              ...artifact,
              title: result.title,
              documentId: result.id,
              kind: result.kind,
              isVisible: true,
              boundingBox: {
                left: boundingBox.x,
                top: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height,
              },
            },
      )
    },
    [setArtifact, result],
  )

  return (
    <div
      className="absolute top-0 left-0 z-10 size-full rounded-xl"
      ref={hitboxRef}
      onClick={handleClick}
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex w-full items-center justify-end p-4">
        <div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
          <FullscreenIcon />
        </div>
      </div>
    </div>
  )
}

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) return false
  return true
})

const PureDocumentHeader = ({
  title,
  kind,
  isStreaming,
}: {
  title: string
  kind: ArtifactKind
  isStreaming: boolean
}) => (
  <div className="dark:bg-muted flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700">
    <div className="flex flex-row items-start gap-3 sm:items-center">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : kind === 'image' ? (
          <ImageIcon />
        ) : kind === 'project' ? (
          <PlayIcon />
        ) : kind === 'script' ? (
          <PenIcon />
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="-translate-y-1 font-medium sm:translate-y-0">{title}</div>
    </div>
    <div className="w-8" />
  </div>
)

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false
  if (prevProps.isStreaming !== nextProps.isStreaming) return false

  return true
})

const DocumentContent = ({ document }: { document: Document }) => {
  const { artifact } = useArtifact()

  const containerClassName = cn(
    'h-[257px] overflow-y-scroll border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700',
    {
      'p-4 sm:px-14 sm:py-16':
        document.kind === 'text' ||
        document.kind === 'project' ||
        document.kind === 'story',
      'p-0': document.kind === 'code',
    },
  )

  const commonProps = {
    content: document.content ?? '',
    isCurrentVersion: true,
    currentVersionIndex: 0,
    status: artifact.status,
    saveContent: () => {},
    suggestions: [],
  }

  return (
    <div className={containerClassName}>
      {document.kind === 'text' ? (
        <Editor {...commonProps} onSaveContent={() => {}} />
      ) : document.kind === 'code' ? (
        <div className="relative flex w-full flex-1">
          <div className="absolute inset-0">
            <CodeEditor {...commonProps} onSaveContent={() => {}} />
          </div>
        </div>
      ) : document.kind === 'sheet' ? (
        <div className="relative flex size-full flex-1 p-4">
          <div className="absolute inset-0">
            <SpreadsheetEditor {...commonProps} />
          </div>
        </div>
      ) : document.kind === 'image' ? (
        <ImageEditor
          title={document.title}
          content={document.content ?? ''}
          isCurrentVersion={true}
          currentVersionIndex={0}
          status={artifact.status}
          isInline={true}
        />
      ) : document.kind === 'project' ? (
        <Markdown>{generateProjectPreview(document.content ?? '')}</Markdown>
      ) : document.kind === 'story' ? (
        <Markdown>{generateStoryPreview(document.content ?? '')}</Markdown>
      ) : null}
    </div>
  )
}
