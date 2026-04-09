// ============================================================
// Shared types mirroring server API responses
// ============================================================

export type OutputFormat = 'xlsx' | 'pdf'
export type ParameterType = 'string' | 'number' | 'date' | 'select'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ParameterDefinition {
  name: string
  label: string
  type: ParameterType
  required: boolean
  default?: unknown
  options?: { value: string; label: string }[]
}

export interface ReportInfo {
  id: string
  name: string
  description: string
  supportedFormats: OutputFormat[]
  parameters: ParameterDefinition[]
}

export interface ReportRunDTO {
  id: string
  reportType: string
  status: RunStatus
  format: string
  params: Record<string, unknown>
  fileName: string | null
  fileSize: number | null
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
