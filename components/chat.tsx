'use client'

import type { Attachment, UIMessage } from 'ai'
import type { Session } from 'next-auth'
import { ChatHeader } from '@/components/chat-header'
import { useArtifactSelector } from '@/hooks/use-artifact'
import { useAutoResume } from '@/hooks/use-auto-resume'
import { useChatVisibility } from '@/hooks/use-chat-visibility'
import { ChatSDKError } from '@/lib/errors'
import { fetchWithErrorHandlers, generateUUID } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import { unstable_serialize } from 'swr/infinite'

import type { VisibilityType } from './visibility-selector'
import { Artifact } from './artifact'
import { Messages } from './messages'
import { MultimodalInput } from './multimodal-input'
import { getChatHistoryPaginationKey } from './sidebar-history'
import { toast } from './toast'

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string
  initialMessages: Array<UIMessage>
  initialChatModel: string
  initialVisibilityType: VisibilityType
  isReadonly: boolean
  session: Session
  autoResume: boolean
}) {
  const { mutate } = useSWRConfig()

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  })

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    api: '/api/chat?agentId=explainerVideoMock',
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      selectedChatModel: initialChatModel,
      selectedVisibilityType: visibilityType,
    }),
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey))
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        })
      }
    },
  })

  const searchParams = useSearchParams()
  const query = searchParams.get('query')

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false)

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      })

      setHasAppendedQuery(true)
      window.history.replaceState({}, '', `/chat/${id}`)
    }
  }, [query, append, hasAppendedQuery, id])

  // const { data: votes } = useSWR<Array<Vote>>(
  //   messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
  //   fetcher,
  // )

  const [attachments, setAttachments] = useState<Array<Attachment>>([])
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  })

  return (
    <>
      <div className="bg-background flex h-dvh min-w-0 flex-col">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={[]}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={[]}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  )
}
