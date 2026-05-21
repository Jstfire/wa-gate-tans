import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, bigint } from 'drizzle-orm/pg-core'

// Messages table
export const messages_wagate = pgTable('messages_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  waMessageId: varchar('wa_message_id', { length: 255 }).notNull().unique(),
  fromNumber: varchar('from_number', { length: 20 }).notNull(),
  toNumber: varchar('to_number', { length: 20 }).notNull(),
  messageType: varchar('message_type', { length: 20 }).notNull(), // 'text', 'image', 'document', 'location'
  content: text('content'),
  mediaUrl: text('media_url'),
  metadata: jsonb('metadata'),
  direction: varchar('direction', { length: 10 }).notNull(), // 'inbound', 'outbound'
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'sent', 'delivered', 'read', 'failed'
  isFromBot: boolean('is_from_bot').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Contacts table
export const contacts_wagate = pgTable('contacts_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  profilePicUrl: text('profile_pic_url'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  hasChatHistory: boolean('has_chat_history').default(false).notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Content Files table
export const content_files_wagate = pgTable('content_files_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  googleDriveId: varchar('google_drive_id', { length: 255 }).notNull().unique(),
  googleDriveUrl: text('google_drive_url').notNull(),
  category: varchar('category', { length: 100 }),
  uploadedBy: uuid('uploaded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports
export type Message = typeof messages_wagate.$inferSelect
export type NewMessage = typeof messages_wagate.$inferInsert
export type Contact = typeof contacts_wagate.$inferSelect
export type NewContact = typeof contacts_wagate.$inferInsert
export type ContentFile = typeof content_files_wagate.$inferSelect
export type NewContentFile = typeof content_files_wagate.$inferInsert
