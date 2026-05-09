import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import type { AgentStatusHistory, Profile } from '@/db/schema'

type HistoryEntry = AgentStatusHistory & {
  changedBy: Pick<Profile, 'id' | 'fullName'> | null
}

export function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="py-4 text-center text-[13px] text-graphite">No status changes yet.</p>
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {history.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {i < history.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-hairline" />
          )}

          {/* Dot */}
          <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-hairline bg-paper">
            <div className="h-2 w-2 rounded-full bg-graphite-light" />
          </div>

          {/* Content */}
          <div className="flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {entry.fromStatus && (
                <>
                  <StatusBadge status={entry.fromStatus} />
                  <span className="text-[12px] text-graphite-light">→</span>
                </>
              )}
              <StatusBadge status={entry.toStatus} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-graphite">
              {entry.changedBy && <span>{entry.changedBy.fullName}</span>}
              <span>·</span>
              <span>{formatDateTime(entry.changedAt)}</span>
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
