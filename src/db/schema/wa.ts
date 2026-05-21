import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, integer } from 'drizzle-orm/pg-core'

// WA Accounts table
export const wa_accounts_wagate = pgTable('wa_accounts_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).unique(),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull(), // 'disconnected', 'connecting', 'connected', 'error'
  qrCode: text('qr_code'),
  sessionData: jsonb('session_data'),
  lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// WA Templates table
export const wa_templates_wagate = pgTable('wa_templates_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables').$type<string[]>(),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Chatbot Rules table
export const chatbot_rules_wagate = pgTable('chatbot_rules_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  trigger: varchar('trigger', { length: 50 }).notNull(),
  parentTrigger: varchar('parent_trigger', { length: 50 }),
  responseType: varchar('response_type', { length: 20 }).notNull(), // 'text', 'location', 'pdf', 'link', 'admin'
  responseContent: text('response_content').notNull(),
  responseMetadata: jsonb('response_metadata').$type<{
    pdf_id?: string
    location_coords?: { lat: number; lng: number }
    link_url?: string
  }>(),
  order: integer('order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Officer Numbers table
export const officer_numbers_wagate = pgTable('officer_numbers_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  position: varchar('position', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports
export type WaAccount = typeof wa_accounts_wagate.$inferSelect
export type NewWaAccount = typeof wa_accounts_wagate.$inferInsert
export type WaTemplate = typeof wa_templates_wagate.$inferSelect
export type NewWaTemplate = typeof wa_templates_wagate.$inferInsert
export type ChatbotRule = typeof chatbot_rules_wagate.$inferSelect
export type NewChatbotRule = typeof chatbot_rules_wagate.$inferInsert
export type OfficerNumber = typeof officer_numbers_wagate.$inferSelect
export type NewOfficerNumber = typeof officer_numbers_wagate.$inferInsert
