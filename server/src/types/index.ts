// ============================================================
// Report Platform — Shared Types
// ============================================================

/** Supported output formats */
export type OutputFormat = 'xlsx' | 'pdf'

/** Parameter types for report configuration UI */
export type ParameterType = 'string' | 'number' | 'date' | 'select'

/** Describes a single parameter a report accepts */
export interface ParameterDefinition {
  name: string
  label: string
  type: ParameterType
  required: boolean
  default?: unknown
  options?: { value: string; label: string }[]
}

/** Report metadata exposed via API */
export interface ReportInfo {
  id: string
  name: string
  description: string
  supportedFormats: OutputFormat[]
  parameters: ParameterDefinition[]
}

/** Result of a successful report generation */
export interface GenerationResult {
  filePath: string
  fileName: string
  mimeType: string
  fileSize: number
}

/** Run status as stored in DB */
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

/** Report run record (API response) */
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

/** Standard API response wrappers */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
