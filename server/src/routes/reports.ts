import { Router } from 'express'
import { getAllReports, getReport } from '../reports/index.js'
import type { ReportInfo, ApiSuccessResponse } from '../types/index.js'

const router = Router()

/** GET /api/reports — list all available reports */
router.get('/', (_req, res) => {
  const reports = getAllReports()
  const data: ReportInfo[] = reports.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    supportedFormats: r.supportedFormats,
    parameters: r.parameters,
  }))

  const response: ApiSuccessResponse<ReportInfo[]> = { success: true, data }
  res.json(response)
})

/** GET /api/reports/:id — get a single report definition */
router.get('/:id', (req, res) => {
  const report = getReport(req.params.id)
  if (!report) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } })
    return
  }

  const data: ReportInfo = {
    id: report.id,
    name: report.name,
    description: report.description,
    supportedFormats: report.supportedFormats,
    parameters: report.parameters,
  }
  res.json({ success: true, data })
})

export default router
