import type { ReportInfo, OutputFormat, GenerationResult } from '../types/index.js'

// ============================================================
// Base Report Definition
// ============================================================
// Каждый новый отчёт реализует этот интерфейс.
// Для добавления отчёта:
//   1. Создать файл в src/reports/
//   2. Реализовать ReportDefinition
//   3. Зарегистрировать в src/reports/index.ts
// ============================================================

export interface ReportDefinition {
  /** Unique report identifier (e.g. "weather-summary") */
  readonly id: string

  /** Human-readable name */
  readonly name: string

  /** Description for the UI */
  readonly description: string

  /** Formats this report can produce */
  readonly supportedFormats: OutputFormat[]

  /** Parameter definitions for the UI form */
  readonly parameters: ReportInfo['parameters']

  /**
   * Generate the report file.
   * Called by ReportRunner in an async context.
   * Must return path to the generated file.
   */
  generate(params: Record<string, unknown>, format: OutputFormat): Promise<GenerationResult>
}
