// ============================================================
// Report Registry — register all reports here
// ============================================================
// To add a new report:
//   1. Create a file in src/reports/ implementing ReportDefinition
//   2. Import and add to the REPORTS array below
//   3. That's it — the API and UI will pick it up automatically
// ============================================================

import type { ReportDefinition } from './base.js'
import { weatherReport } from './weather-report.js'
import { userActivityReport } from './user-activity-report.js'

const REPORTS: ReportDefinition[] = [weatherReport, userActivityReport]

const registry = new Map<string, ReportDefinition>()

for (const report of REPORTS) {
  if (registry.has(report.id)) {
    throw new Error(`Duplicate report ID: ${report.id}`)
  }
  registry.set(report.id, report)
}

export function getAllReports(): ReportDefinition[] {
  return Array.from(registry.values())
}

export function getReport(id: string): ReportDefinition | undefined {
  return registry.get(id)
}
