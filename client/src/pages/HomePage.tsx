import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { ReportCard } from '../components/ReportCard'
import type { ReportInfo } from '../types'

export function HomePage() {
  const [reports, setReports] = useState<ReportInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getReports()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">Ошибка загрузки отчётов</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Доступные отчёты</h1>
      <p className="mt-1 text-gray-500">Выберите отчёт для генерации</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>

      {reports.length === 0 && (
        <p className="mt-8 text-center text-gray-400">Отчёты не зарегистрированы</p>
      )}
    </div>
  )
}
