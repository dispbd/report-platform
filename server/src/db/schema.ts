import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  bigint,
  serial,
} from 'drizzle-orm/pg-core'

// ============================================================
// 1. report_runs — запуски генерации отчётов
// ============================================================
export const reportRuns = pgTable('report_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportType: text('report_type').notNull(),
  status: text('status').$type<'pending' | 'running' | 'completed' | 'failed'>().notNull().default('pending'),
  format: text('format').notNull(), // xlsx, pdf
  params: jsonb('params').$type<Record<string, unknown>>().default({}),
  filePath: text('file_path'),
  fileName: text('file_name'),
  fileSize: bigint('file_size', { mode: 'number' }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

// ============================================================
// 2. user_activity — данные для отчёта "Активность пользователей"
// ============================================================
export const userActivity = pgTable('user_activity', {
  id: serial('id').primaryKey(),
  userName: text('user_name').notNull(),
  action: text('action').notNull(),
  page: text('page'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
