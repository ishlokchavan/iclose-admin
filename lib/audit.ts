import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

export interface AuditEntry {
  actorId: string | null
  action: string
  entity: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
  ua?: string
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from('audit_logs').insert({
      actor_id: entry.actorId, action: entry.action, entity: entry.entity,
      entity_id: entry.entityId ?? null, before_json: entry.before ?? null,
      after_json: entry.after ?? null, ip: entry.ip ?? null, ua: entry.ua ?? null,
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}

export function extractRequestMeta(headers: Headers): { ip: string | null; ua: string | null } {
  return {
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? null,
    ua: headers.get('user-agent') ?? null,
  }
}
