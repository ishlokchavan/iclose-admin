import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import type { ApplicationStatus } from '@/db/schema'

type HistoryEntry = {
  id: string
  from_status?: string | null
  to_status?: string
  changed_at?: string
  reason?: string | null
  changedBy?: { id: string; full_name?: string } | null
}

export function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  if (!history?.length) {
    return <p className="py-4 text-center text-[13px] text-graphite">No status changes yet.</p>
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {history.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < history.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-hairline" />
          )}
          <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-hairline bg-paper">
            <div className="h-2 w-2 rounded-full bg-graphite-light" />
          </div>
          <div className="flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {entry.from_status && (
                <>
                  <StatusBadge status={entry.from_status as ApplicationStatus} />
                  <span className="text-[12px] text-graphite-light">→</span>
                </>
              )}
              {entry.to_status && <StatusBadge status={entry.to_status as ApplicationStatus} />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-graphite">
              {entry.changedBy?.full_name && <span>{entry.changedBy.full_name}</span>}
              {entry.changed_at && <><span>·</span><span>{formatDateTime(entry.changed_at)}</span></>}
            </div>
            {entry.reason && (
              <p className="mt-1 text-[12px] italic text-graphite">&ldquo;{entry.reason}&rdquo;</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
