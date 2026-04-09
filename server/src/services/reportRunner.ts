import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { reportRuns } from '../db/schema.js'
import { getReport } from '../reports/index.js'
import logger from '../logger/index.js'
import type { OutputFormat, ReportRunDTO } from '../types/index.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * Create a new run record and start generation asynchronously.
 * Returns immediately with the run ID (status = pending).
 */
export async function startRun(
  reportType: string,
  format: OutputFormat,
  params: Record<string, unknown>,
): Promise<ReportRunDTO> {
  const report = getReport(reportType)
  if (!report) {
    throw new AppError(404, 'REPORT_NOT_FOUND', `Report "${reportType}" not found`)
  }

  if (!report.supportedFormats.includes(format)) {
    throw new AppError(
      400,
      'UNSUPPORTED_FORMAT',
      `Report "${reportType}" does not support format "${format}". Supported: ${report.supportedFormats.join(', ')}`,
    )
  }

  const id = uuidv4()

  const [run] = await db
    .insert(reportRuns)
    .values({
      id,
      reportType,
      format,
      params,
      status: 'pending',
    })
    .returning()

  // Fire-and-forget: execute generation in background
  executeGeneration(id, report.id, format, params).catch((err) => {
    logger.error({ err, runId: id }, 'Background generation failed unexpectedly')
  })

  return toDTO(run)
}

/**
 * Execute report generation, updating DB status along the way.
 */
async function executeGeneration(
  runId: string,
  reportType: string,
  format: OutputFormat,
  params: Record<string, unknown>,
) {
  const report = getReport(reportType)
  if (!report) return

  // Mark as running
  await db
    .update(reportRuns)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(reportRuns.id, runId))

  try {
    logger.info({ runId, reportType, format }, 'Starting report generation')
    const result = await report.generate(params, format)

    await db
      .update(reportRuns)
      .set({
        status: 'completed',
        filePath: result.filePath,
        fileName: result.fileName,
        fileSize: result.fileSize,
        completedAt: new Date(),
      })
      .where(eq(reportRuns.id, runId))

    logger.info({ runId, fileName: result.fileName }, 'Report generation completed')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ err, runId }, 'Report generation failed')

    await db
      .update(reportRuns)
      .set({
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(reportRuns.id, runId))
  }
}

export async function getRun(id: string): Promise<ReportRunDTO | null> {
  const [run] = await db.select().from(reportRuns).where(eq(reportRuns.id, id)).limit(1)
  return run ? toDTO(run) : null
}

export async function getAllRuns(reportType?: string): Promise<ReportRunDTO[]> {
  const query = reportType
    ? db.select().from(reportRuns).where(eq(reportRuns.reportType, reportType))
    : db.select().from(reportRuns)

  const rows = await query.orderBy(reportRuns.createdAt)
  return rows.map(toDTO)
}

function toDTO(run: typeof reportRuns.$inferSelect): ReportRunDTO {
  return {
    id: run.id,
    reportType: run.reportType,
    status: run.status,
    format: run.format,
    params: (run.params ?? {}) as Record<string, unknown>,
    fileName: run.fileName,
    fileSize: run.fileSize ? Number(run.fileSize) : null,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}
