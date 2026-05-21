import { pgTable, uuid, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core'
import { wa_templates_wagate } from './wa'

// Blast Jobs table
export const blast_jobs_wagate = pgTable('blast_jobs_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  templateId: uuid('template_id').references(() => wa_templates_wagate.id, { onDelete: 'set null' }),
  messageContent: text('message_content').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'draft', 'queued', 'running', 'paused', 'completed', 'cancelled'
  totalRecipients: integer('total_recipients').notNull(),
  sentCount: integer('sent_count').default(0).notNull(),
  failedCount: integer('failed_count').default(0).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Blast Recipients table
export const blast_recipients_wagate = pgTable('blast_recipients_wagate', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => blast_jobs_wagate.id, { onDelete: 'cascade' }),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'sending', 'sent', 'failed'
  sentAt: timestamp('sent_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports
export type BlastJob = typeof blast_jobs_wagate.$inferSelect
export type NewBlastJob = typeof blast_jobs_wagate.$inferInsert
export type BlastRecipient = typeof blast_recipients_wagate.$inferSelect
export type NewBlastRecipient = typeof blast_recipients_wagate.$inferInsert
