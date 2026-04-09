import type { ReportInfo, ReportRunDTO, ApiResponse, OutputFormat } from '../types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Unknown API error')
  }
  return json.data
}

export const api = {
  getReports: () => request<ReportInfo[]>('/reports'),

  getReport: (id: string) => request<ReportInfo>(`/reports/${encodeURIComponent(id)}`),

  startRun: (reportType: string, format: OutputFormat, params: Record<string, unknown>) =>
    request<ReportRunDTO>('/runs', {
      method: 'POST',
      body: JSON.stringify({ reportType, format, params }),
    }),

  getRuns: (reportType?: string) =>
    request<ReportRunDTO[]>(reportType ? `/runs?reportType=${encodeURIComponent(reportType)}` : '/runs'),

  getRun: (id: string) => request<ReportRunDTO>(`/runs/${encodeURIComponent(id)}`),

  getDownloadUrl: (runId: string) => `${BASE}/runs/${encodeURIComponent(runId)}/download`,
}
