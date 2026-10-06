import { randomUUID } from 'crypto'
import { adminSessionFromRequest } from '@/lib/auth-utils'
import { pool } from '@/lib/db'

export async function recordAdminAuditEvent(
  request: Request,
  event: {
    action: string
    entityType: string
    entityId?: string | null
    description: string
  },
) {
  const session = await adminSessionFromRequest(request)
  if (!session || session.mustChangePassword) {
    throw new Error('An authenticated admin session is required to record this event.')
  }
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, description, actor, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        randomUUID(),
        event.action,
        event.entityType,
        event.entityId ?? null,
        event.description.slice(0, 2000),
        session.username,
      ],
    )
  } catch (error) {
    console.error('[admin-audit] failed to record admin operation', {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      actor: session.username,
      error,
    })
    throw new Error('The operation succeeded, but its audit event could not be recorded.', { cause: error })
  }
}
