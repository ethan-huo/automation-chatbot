import type { UserType } from '@/app/(auth)/auth'
import type { RequestHints } from '@/lib/ai/prompts'
import type { Chat } from '@/lib/db/schema'
import type { ResumableStreamContext } from 'resumable-stream'
import { auth } from '@/app/(auth)/auth'
import { entitlementsByUserType } from '@/lib/ai/entitlements'
import { systemPrompt } from '@/lib/ai/prompts'
import { myProvider } from '@/lib/ai/providers'
import { generateAnimationAssetsV2 } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { createDocument } from '@/lib/ai/tools/create-document'
import { getWeather } from '@/lib/ai/tools/get-weather'
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions'
import { updateDocument } from '@/lib/ai/tools/update-document'
import { isProductionEnvironment } from '@/lib/constants'
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries'
import { ChatSDKError } from '@/lib/errors'
import { createInMemoryPubSub } from '@/lib/resumable-stream-local'
import { generateUUID, getTrailingMessageId } from '@/lib/utils'
import { geolocation } from '@vercel/functions'
import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai'
import { differenceInSeconds } from 'date-fns'
import { after } from 'next/server'
import { createResumableStreamContext } from 'resumable-stream'

import type { PostRequestBody } from './schema'
import { generateTitleFromUserMessage } from '../../actions'
import { postRequestBodySchema } from './schema'

export const maxDuration = 60

let globalStreamContext: ResumableStreamContext | null = null

function getStreamContext() {
  if (!globalStreamContext) {
    const pubSub = createInMemoryPubSub()
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        publisher: pubSub,
        subscriber: pubSub,
      })
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        )
      } else {
        console.error(error)
      }
    }
  }

  return globalStreamContext
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody

  try {
    const json = await request.json()
    requestBody = postRequestBodySchema.parse(json)
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse()
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody

    const session = await auth()

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse()
    }

    const userType: UserType = session.user.type

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    })

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse()
    }

    const chat = await getChatById({ id })

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      })

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      })
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse()
      }
    }

    const previousMessages = await getMessagesByChatId({ id })

    const messages = appendClientMessage({
      //# #ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      // @ts-ignore
      messages: previousMessages,
      message,
    })

    const { longitude, latitude, city, country } = geolocation(request)

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    })

    const streamId = generateUUID()
    await createStreamId({ streamId, chatId: id })

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  'generateAnimationAssets',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({
              session,
              dataStream,
              chatId: id,
            }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            generateAnimationAssets: generateAnimationAssetsV2,
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                })

                if (!assistantId) {
                  throw new Error('No assistant message found!')
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                })

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                })
              } catch (_) {
                console.error('Failed to save chat')
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        })

        result.consumeStream()

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        })
      },
      onError: () => {
        return 'Oops, an error occurred!'
      },
    })

    const streamContext = getStreamContext()

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      )
    } else {
      return new Response(stream)
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse()
    }
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext()
  const resumeRequestedAt = new Date()

  if (!streamContext) {
    return new Response(null, { status: 204 })
  }

  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get('chatId')

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse()
  }

  const session = await auth()

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse()
  }

  let chat: Chat

  try {
    chat = await getChatById({ id: chatId })
  } catch {
    return new ChatSDKError('not_found:chat').toResponse()
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse()
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse()
  }

  const streamIds = await getStreamIdsByChatId({ chatId })

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse()
  }

  const recentStreamId = streamIds.at(-1)

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse()
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  })

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  )

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId })
    const mostRecentMessage = messages.at(-1)

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 })
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 })
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt)

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 })
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        })
      },
    })

    return new Response(restoredStream, { status: 200 })
  }

  return new Response(stream, { status: 200 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse()
  }

  const session = await auth()

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse()
  }

  const chat = await getChatById({ id })

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse()
  }

  const deletedChat = await deleteChatById({ id })

  return Response.json(deletedChat, { status: 200 })
}
