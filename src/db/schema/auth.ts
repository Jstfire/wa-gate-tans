import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb } from 'drizzle-orm/pg-core'

// Sessions table
export const sessions_wagate = pgTable('sessions_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Roles table
export const roles_wagate = pgTable('roles_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  permissions: jsonb('permissions').notNull().$type<{
    wa_connect: boolean
    wa_send: boolean
    wa_blast: boolean
    templates: boolean
    chatbot: boolean
    content: boolean
    api_keys: boolean
    users: boolean
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// User Roles junction table
export const user_roles_wagate = pgTable('user_roles_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => roles_wagate.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// API Keys table
export const api_keys_wagate = pgTable('api_keys_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  createdBy: uuid('created_by'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports
export type Session = typeof sessions_wagate.$inferSelect
export type NewSession = typeof sessions_wagate.$inferInsert
export type Role = typeof roles_wagate.$inferSelect
export type NewRole = typeof roles_wagate.$inferInsert
export type UserRole = typeof user_roles_wagate.$inferSelect
export type NewUserRole = typeof user_roles_wagate.$inferInsert
export type ApiKey = typeof api_keys_wagate.$inferSelect
export type NewApiKey = typeof api_keys_wagate.$inferInsert
