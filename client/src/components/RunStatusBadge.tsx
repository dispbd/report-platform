import type { RunStatus } from '@/types'

const STATUS_MAP: Record<RunStatus, { label: string; className: string }> = {
  pending: { label: 'В очереди', className: 'bg-yellow-100 text-yellow-800' },
  running: { label: 'Генерация...', className: 'bg-blue-100 text-blue-800 animate-pulse' },
  completed: { label: 'Готов', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Ошибка', className: 'bg-red-100 text-red-800' },
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const info = STATUS_MAP[status] ?? STATUS_MAP.pending
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}
