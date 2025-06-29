import type { InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  json,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'


export const user = pgTable('User', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => ulid()),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
})

export type User = InferSelectModel<typeof user>

export const chat = pgTable('Chat', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => ulid()),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
})

export type Chat = InferSelectModel<typeof chat>

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => ulid()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
})

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>

export const message = pgTable('Message_v2', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => ulid()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
})

export type DBMessage = InferSelectModel<typeof message>

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    }
  },
)

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    }
  },
)

export type Vote = InferSelectModel<typeof vote>

export const document = pgTable(
  'Document',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => ulid()),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    content: text('content'),
    kind: varchar('text', {
      enum: ['text', 'code', 'image', 'sheet', 'project', 'story'],
    })
      .notNull()
      .default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    }
  },
)

export type Document = InferSelectModel<typeof document>

export const suggestion = pgTable(
  'Suggestion',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => ulid()),
    documentId: text('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
)

export type Suggestion = InferSelectModel<typeof suggestion>

export const stream = pgTable(
  'Stream',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => ulid()),
    chatId: text('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
)

export type Stream = InferSelectModel<typeof stream>

// Animation assets table for storing generated audio and image files
export const animationAsset = pgTable('AnimationAsset', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => ulid()),
  storyId: text('storyId').notNull(),
  sceneId: text('sceneId').notNull(),
  assetType: varchar('assetType', {
    enum: ['audio', 'image', 'whiteboard_animation', 'video_composition'],
  }).notNull(),
  s3Url: text('s3Url').notNull(),
  s3Key: text('s3Key').notNull(),
  contentType: text('contentType').notNull(),
  fileSize: text('fileSize'),
  duration: text('duration'), // For audio files
  status: varchar('status', {
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  errorMessage: text('errorMessage'),
  metadata: json('metadata'), // Additional metadata like voice settings, image dimensions, etc.
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type AnimationAsset = InferSelectModel<typeof animationAsset>

// Long-running task tracking table
// export const task = pgTable('Task', {
//   id: text()
//     .primaryKey()
//     .notNull()
//     .$defaultFn(() => ulid()),
//   user_id: text()
//     .notNull()
//     .references(() => user.id),
//   task_id: text().notNull().unique(),
//   type: varchar({ enum: ['video', 'audio', 'image'] }).notNull(),
//   status: varchar({
//     enum: ['pending', 'processing', 'completed', 'failed'],
//   })
//     .notNull()
//     .default('pending'),
//   asset_url: text(),
//   error: text(),
//   metadata: json(), // Additional task-specific data
//   created_at: timestamp()
//     .notNull()
//     .$defaultFn(() => new Date()),
//   updated_at: timestamp()
//     .notNull()
//     .$defaultFn(() => new Date())
//     .$onUpdateFn(() => new Date()),
// })

// export type Task = InferSelectModel<typeof task>
