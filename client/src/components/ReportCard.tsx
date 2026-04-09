import { Link } from 'react-router-dom'
import type { ReportInfo } from '../types'

const FORMAT_ICONS: Record<string, string> = {
  xlsx: '📗',
  pdf: '📕',
}

export function ReportCard({ report }: { report: ReportInfo }) {
  return (
    <Link
      to={`/reports/${report.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-blue-300"
    >
      <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
      <p className="mt-2 text-sm text-gray-500">{report.description}</p>
      <div className="mt-4 flex gap-2">
        {report.supportedFormats.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
          >
            {FORMAT_ICONS[f] ?? '📄'} {f.toUpperCase()}
          </span>
        ))}
      </div>
      {report.parameters.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Параметры: {report.parameters.map((p) => p.label).join(', ')}
        </p>
      )}
    </Link>
  )
}
