import 'server-only'

import type { ArtifactKind } from '@/components/artifact'
import type { VisibilityType } from '@/components/visibility-selector'
import type { SQL } from 'drizzle-orm'
import { and, asc, count, desc, eq, gt, gte, inArray, lt } from 'drizzle-orm'
import { ulid as generateUUID } from 'ulid'

import type { Chat, DBMessage, Suggestion, User } from './schema'
import { ChatSDKError } from '../errors'
import { db } from './index'
import {
  animationAsset,
  chat,
  document,
  message,
  stream,
  suggestion,
  user,
  vote,
} from './schema'
import { generateHashedPassword } from './utils'

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    )
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password)

  try {
    return await db.insert(user).values({ email, password: hashedPassword })
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user')
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`
  const password = generateHashedPassword(generateUUID())

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    })
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    )
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string
  userId: string
  title: string
  visibility: VisibilityType
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    })
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat')
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id))
    await db.delete(message).where(eq(message.chatId, id))
    await db.delete(stream).where(eq(stream.chatId, id))

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning()
    return chatsDeleted
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    )
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string
  limit: number
  startingAfter: string | null
  endingBefore: string | null
}) {
  try {
    const extendedLimit = limit + 1

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit)

    let filteredChats: Array<Chat> = []

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1)

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        )
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt))
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1)

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        )
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt))
    } else {
      filteredChats = await query()
    }

    const hasMore = filteredChats.length > limit

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    )
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id))
    return selectedChat
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id')
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>
}) {
  try {
    return await db.insert(message).values(messages)
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages')
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    )
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string
  messageId: string
  type: 'up' | 'down'
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)))

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    })
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message')
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    )
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
}: {
  id: string
  title: string
  kind: ArtifactKind
  content: string
  userId: string
  chatId: string
}) {
  try {
    console.log('[saveDocument] start', {
      id,
      title,
      kind,
      chatId,
      userId,
    })

    const result = await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        chatId,
        createdAt: new Date(),
      })
      .returning()

    console.log('[saveDocument] saved', {
      id,
      title,
      kind,
      chatId,
    })

    return result
  } catch (error) {
    console.error('[saveDocument] error', {
      id,
      title,
      kind,
      chatId,
      error,
    })
    throw new ChatSDKError('bad_request:database', 'Failed to save document')
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt))

    return documents
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    )
  }
}

export async function getDocumentsByChatIdAndKind({
  chatId,
  kind,
}: {
  chatId: string
  kind: ArtifactKind
}) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(and(eq(document.chatId, chatId), eq(document.kind, kind)))

    return documents
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by chat id',
    )
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))

    return selectedDocument
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    )
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string
  timestamp: Date
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      )

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning()
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    )
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>
}) {
  try {
    return await db.insert(suggestion).values(suggestions)
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save suggestions')
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    )
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    )
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string
  timestamp: Date
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)))

    const messageIds = messagesToDelete.map((message) => message.id)

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        )

      return await db
        .delete(message)
        .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)))
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    )
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string
  visibility: 'private' | 'public'
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    )
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string
  differenceInHours: number
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    )

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute()

    return stats?.count ?? 0
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    )
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string
  chatId: string
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() })
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id')
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute()

    return streamIds.map(({ id }) => id)
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    )
  }
}

// Animation Asset queries
export async function createAnimationAsset({
  storyId,
  sceneId,
  assetType,
  s3Url,
  s3Key,
  contentType,
  fileSize,
  duration,
  metadata,
  status = 'completed',
}: {
  storyId: string
  sceneId: string
  assetType: 'audio' | 'image'
  s3Url: string
  s3Key: string
  contentType: string
  fileSize?: string
  duration?: string
  metadata?: any
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}) {
  try {
    console.log(
      `[createAnimationAsset] 💾 Creating ${assetType} asset for story ${storyId}, scene ${sceneId}`,
    )
    console.log(
      `[createAnimationAsset] 📊 Status: ${status}, ContentType: ${contentType}`,
    )

    const now = new Date()
    console.log(`[createAnimationAsset] 🔄 Inserting into database...`)

    const [asset] = await db
      .insert(animationAsset)
      .values({
        storyId,
        sceneId,
        assetType,
        s3Url,
        s3Key,
        contentType,
        fileSize,
        duration,
        metadata,
        status,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    console.log(
      `[createAnimationAsset] ✅ Asset created successfully: ${asset.id}`,
    )
    return asset
  } catch (error) {
    console.error(`[createAnimationAsset] ❌ Database error:`, error)
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create animation asset',
    )
  }
}

export async function createPendingAnimationAsset({
  storyId,
  sceneId,
  assetType,
  contentType,
  metadata,
}: {
  storyId: string
  sceneId: string
  assetType: 'audio' | 'image'
  contentType: string
  metadata?: any
}) {
  return createAnimationAsset({
    storyId,
    sceneId,
    assetType,
    s3Url: '', // Will be updated when generation completes
    s3Key: '',
    contentType,
    metadata,
    status: 'pending',
  })
}

export async function getAnimationAssetsByStoryId({
  storyId,
}: {
  storyId: string
}) {
  try {
    return await db
      .select()
      .from(animationAsset)
      .where(eq(animationAsset.storyId, storyId))
      .orderBy(asc(animationAsset.sceneId), asc(animationAsset.assetType))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get animation assets by story id',
    )
  }
}

export async function getAnimationAssetsByChatId({
  chatId,
}: {
  chatId: string
}) {
  try {
    return await db
      .select({
        id: animationAsset.id,
        storyId: animationAsset.storyId,
        sceneId: animationAsset.sceneId,
        assetType: animationAsset.assetType,
        s3Url: animationAsset.s3Url,
        s3Key: animationAsset.s3Key,
        contentType: animationAsset.contentType,
        fileSize: animationAsset.fileSize,
        duration: animationAsset.duration,
        status: animationAsset.status,
        errorMessage: animationAsset.errorMessage,
        metadata: animationAsset.metadata,
        createdAt: animationAsset.createdAt,
        updatedAt: animationAsset.updatedAt,
      })
      .from(animationAsset)
      .innerJoin(document, eq(animationAsset.storyId, document.id))
      .where(eq(document.chatId, chatId))
      .orderBy(asc(animationAsset.sceneId), asc(animationAsset.assetType))
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get animation assets by chat id',
    )
  }
}

export async function updateAnimationAssetStatus({
  id,
  status,
  errorMessage,
}: {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
}) {
  try {
    const [asset] = await db
      .update(animationAsset)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(animationAsset.id, id))
      .returning()

    return asset
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update animation asset status',
    )
  }
}

export async function updateAnimationAssetWithS3({
  id,
  s3Url,
  s3Key,
  fileSize,
  duration,
  metadata,
  status = 'completed',
}: {
  id: string
  s3Url: string
  s3Key: string
  fileSize?: string
  duration?: string
  metadata?: any
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}) {
  try {
    const updateData: any = {
      s3Url,
      s3Key,
      fileSize,
      duration,
      status,
      updatedAt: new Date(),
    }

    // Only update metadata if provided
    if (metadata !== undefined) {
      updateData.metadata = metadata
    }

    const [asset] = await db
      .update(animationAsset)
      .set(updateData)
      .where(eq(animationAsset.id, id))
      .returning()

    return asset
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update animation asset with S3 info',
    )
  }
}
