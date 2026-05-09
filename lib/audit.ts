import 'server-only'
import { db } from '@/db/client'
import { auditLogs } from '@/db/schema'

export interface AuditEntry {
  actorId: string | null
  action: string          // e.g. 'agent.status_change', 'cms.publish'
  entity: string          // table name
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
  ua?: string
}

/**
 * Write an audit log entry.
 * Always uses the service-role path — call from Server Actions only.
 * Never throws — audit failures are logged but don't break the operation.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      beforeJson: entry.before ?? null,
      afterJson: entry.after ?? null,
      ip: entry.ip ?? null,
      ua: entry.ua ?? null,
    })
  } catch (err) {
    // Audit failures must never crash the main operation
    console.error('[audit] Failed to write audit log:', err)
  }
}

/**
 * Extract IP and user agent from request headers.
 * Use inside Route Handlers and Server Actions.
 */
export function extractRequestMeta(headers: Headers): { ip: string | null; ua: string | null } {
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    null

  const ua = headers.get('user-agent') ?? null

  return { ip, ua }
}
