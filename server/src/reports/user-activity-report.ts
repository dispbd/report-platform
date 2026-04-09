import path from 'node:path'
import { stat } from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/index.js'
import logger from '../logger/index.js'
import db from '../db/index.js'
import { userActivity } from '../db/schema.js'
import { desc, gte, lte, and, eq } from 'drizzle-orm'
import type { ReportDefinition } from './base.js'
import type { OutputFormat, GenerationResult } from '../types/index.js'

// ============================================================
// User Activity Report (PDF)
// ============================================================
// Data source: PostgreSQL (user_activity table, seeded data)
// Generates a styled HTML table and converts to PDF via Puppeteer.
// ============================================================

async function fetchActivityData(params: Record<string, unknown>) {
  const conditions = []

  if (params.dateFrom) {
    conditions.push(gte(userActivity.createdAt, new Date(params.dateFrom as string)))
  }
  if (params.dateTo) {
    conditions.push(lte(userActivity.createdAt, new Date(params.dateTo as string)))
  }
  if (params.userName) {
    conditions.push(eq(userActivity.userName, params.userName as string))
  }

  const rows = await db
    .select()
    .from(userActivity)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(userActivity.createdAt))
    .limit(500)

  return rows
}

function generateHtml(
  rows: Awaited<ReturnType<typeof fetchActivityData>>,
  params: Record<string, unknown>,
): string {
  const dateRange =
    params.dateFrom || params.dateTo
      ? `${params.dateFrom || '...'} — ${params.dateTo || '...'}`
      : 'За всё время'

  const userFilter = params.userName ? `Пользователь: ${params.userName}` : 'Все пользователи'

  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td>${r.userName}</td>
      <td>${r.action}</td>
      <td>${r.page ?? '—'}</td>
      <td>${r.durationMs != null ? `${r.durationMs} мс` : '—'}</td>
      <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : '—'}</td>
    </tr>`,
    )
    .join('\n')

  // Aggregate stats
  const totalActions = rows.length
  const uniqueUsers = new Set(rows.map((r) => r.userName)).size
  const avgDuration =
    rows.filter((r) => r.durationMs != null).reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
      (rows.filter((r) => r.durationMs != null).length || 1)

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Отчёт: Активность пользователей</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111827; }
    .subtitle { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
    .stats { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat-card {
      background: #f3f4f6; border-radius: 8px; padding: 16px 24px;
      flex: 1; text-align: center;
    }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #2563eb; }
    .stat-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th {
      background: #2563eb; color: white; padding: 10px 12px;
      text-align: left; font-weight: 600;
    }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <h1>Отчёт: Активность пользователей</h1>
  <p class="subtitle">${dateRange} · ${userFilter} · Записей: ${totalActions}</p>

  <div class="stats">
    <div class="stat-card">
      <div class="value">${totalActions}</div>
      <div class="label">Всего действий</div>
    </div>
    <div class="stat-card">
      <div class="value">${uniqueUsers}</div>
      <div class="label">Уникальных пользователей</div>
    </div>
    <div class="stat-card">
      <div class="value">${Math.round(avgDuration)}</div>
      <div class="label">Сред. длительность (мс)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Пользователь</th>
        <th>Действие</th>
        <th>Страница</th>
        <th>Длительность</th>
        <th>Дата/время</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p class="footer">Сгенерировано: ${new Date().toLocaleString('ru-RU')} · Report Platform</p>
</body>
</html>`
}

// Lazy-loaded Puppeteer to avoid startup cost
let browserInstance: Awaited<ReturnType<typeof import('puppeteer')['launch']>> | null = null

async function getBrowser() {
  if (!browserInstance) {
    const puppeteer = await import('puppeteer')
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserInstance
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

export const userActivityReport: ReportDefinition = {
  id: 'user-activity',
  name: 'Активность пользователей',
  description:
    'Отчёт по действиям пользователей из внутренней БД. Фильтрация по дате и пользователю.',
  supportedFormats: ['pdf'],
  parameters: [
    {
      name: 'dateFrom',
      label: 'Дата начала',
      type: 'date',
      required: false,
    },
    {
      name: 'dateTo',
      label: 'Дата окончания',
      type: 'date',
      required: false,
    },
    {
      name: 'userName',
      label: 'Имя пользователя (пусто = все)',
      type: 'string',
      required: false,
      default: '',
    },
  ],

  async generate(params: Record<string, unknown>, format: OutputFormat): Promise<GenerationResult> {
    if (format !== 'pdf') {
      throw new Error(`User activity report does not support format: ${format}`)
    }

    logger.info({ params }, 'Generating user activity report')

    const rows = await fetchActivityData(params)
    const html = generateHtml(rows, params)

    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const fileName = `user-activity-${new Date().toISOString().slice(0, 10)}.pdf`
      const filePath = path.join(config.TEMP_DIR, `${uuidv4()}-${fileName}`)

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      })

      const stats = await stat(filePath)

      return {
        filePath,
        fileName,
        mimeType: 'application/pdf',
        fileSize: stats.size,
      }
    } finally {
      await page.close()
    }
  },
}
