import { Router } from 'express'
import { startRun, getRun, getAllRuns } from '../services/reportRunner.js'
import type { OutputFormat } from '../types/index.js'
import { AppError } from '../middleware/errorHandler.js'
import path from 'node:path'

const router = Router()

/** POST /api/runs — start a new report generation */
router.post('/', async (req, res, next) => {
  try {
    const { reportType, format, params } = req.body as {
      reportType?: string
      format?: string
      params?: Record<string, unknown>
    }

    if (!reportType || !format) {
      throw new AppError(400, 'VALIDATION_ERROR', 'reportType and format are required')
    }

    const run = await startRun(reportType, format as OutputFormat, params ?? {})
    res.status(202).json({ success: true, data: run })
  } catch (err) {
    next(err)
  }
})

/** GET /api/runs — list all runs, optional filter by reportType */
router.get('/', async (req, res, next) => {
  try {
    const reportType = req.query.reportType as string | undefined
    const runs = await getAllRuns(reportType)
    res.json({ success: true, data: runs })
  } catch (err) {
    next(err)
  }
})

/** GET /api/runs/:id — get run status */
router.get('/:id', async (req, res, next) => {
  try {
    const run = await getRun(req.params.id)
    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', 'Run not found')
    }
    res.json({ success: true, data: run })
  } catch (err) {
    next(err)
  }
})

/** GET /api/runs/:id/download — download the result file */
router.get('/:id/download', async (req, res, next) => {
  try {
    const run = await getRun(req.params.id)
    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', 'Run not found')
    }
    if (run.status !== 'completed') {
      throw new AppError(400, 'NOT_READY', `Run is not completed (status: ${run.status})`)
    }

    // run.filePath is stored internally; resolve to absolute
    const runRecord = await import('../db/index.js').then((m) =>
      m.db.query.reportRuns.findFirst({
        where: (r, { eq }) => eq(r.id, req.params.id),
      }),
    )

    if (!runRecord?.filePath) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Generated file not found')
    }

    const absolutePath = path.resolve(runRecord.filePath)
    res.download(absolutePath, run.fileName ?? 'report')
  } catch (err) {
    next(err)
  }
})

export default router
