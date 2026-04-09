import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { RunStatusBadge } from '../components/RunStatusBadge'
import type { ReportInfo, ReportRunDTO, OutputFormat, RunStatus } from '../types'


export function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [report, setReport] = useState<ReportInfo | null>(null)
  const [runs, setRuns] = useState<ReportRunDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('xlsx')
  const [params, setParams] = useState<Record<string, string>>({})

  const loadRuns = useCallback(() => {
    if (!reportId) return
    api.getRuns(reportId).then(setRuns).catch(console.error)
  }, [reportId])

  useEffect(() => {
    if (!reportId) return
    Promise.all([api.getReport(reportId), api.getRuns(reportId)])
      .then(([r, runs]) => {
        setReport(r)
        setRuns(runs)
        setSelectedFormat(r.supportedFormats[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [reportId])

  // Poll runs that are still in progress
  useEffect(() => {
    const hasPending = runs.some((r) => r.status === 'pending' || r.status === 'running')
    if (!hasPending) return

    const interval = setInterval(loadRuns, 2000)
    return () => clearInterval(interval)
  }, [runs, loadRuns])

  const handleGenerate = async () => {
    if (!reportId) return
    setGenerating(true)
    setError(null)
    try {
      const run = await api.startRun(reportId, selectedFormat, params)
      setRuns((prev) => [run, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">Ошибка</p>
        <p className="mt-1 text-sm">{error}</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          ← К списку отчётов
        </Link>
      </div>
    )
  }

  if (!report) return null

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← Все отчёты
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">{report.name}</h1>
      <p className="mt-1 text-gray-500">{report.description}</p>

      {/* Generation form */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Сгенерировать отчёт</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Формат</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as OutputFormat)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {report.supportedFormats.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic parameters */}
          {report.parameters.map((p) => (
            <div key={p.name}>
              <label className="block text-sm font-medium text-gray-700">
                {p.label} {p.required && <span className="text-red-500">*</span>}
              </label>
              {p.type === 'select' && p.options ? (
                <select
                  value={params[p.name] ?? (p.default as string) ?? ''}
                  onChange={(e) => handleParamChange(p.name, e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">— Выберите —</option>
                  {p.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={p.type === 'date' ? 'date' : p.type === 'number' ? 'number' : 'text'}
                  value={params[p.name] ?? (p.default as string) ?? ''}
                  onChange={(e) => handleParamChange(p.name, e.target.value)}
                  placeholder={p.label}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Запуск...
            </>
          ) : (
            '🚀 Сгенерировать'
          )}
        </button>
      </div>

      {/* Runs list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">История запусков</h2>

        {runs.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">Запусков ещё не было</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Формат
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Создан
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Файл
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Действие
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function RunRow({ run }: { run: ReportRunDTO }) {
  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <RunStatusBadge status={run.status as RunStatus} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{run.format.toUpperCase()}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(run.createdAt)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {run.status === 'completed' && run.fileName
          ? `${run.fileName} (${formatSize(run.fileSize)})`
          : run.status === 'failed'
            ? <span className="text-red-500" title={run.error ?? ''}>Ошибка</span>
            : '—'}
      </td>
      <td className="px-4 py-3">
        {run.status === 'completed' && (
          <a
            href={api.getDownloadUrl(run.id)}
            className="text-sm font-medium text-blue-600 hover:underline"
            download
          >
            ⬇ Скачать
          </a>
        )}
      </td>
    </tr>
  )
}


