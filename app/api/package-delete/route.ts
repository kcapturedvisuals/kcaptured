import { verifyUploadRequest } from '@/lib/auth-utils'
import { appendUploadLog, getClientIp } from '@/lib/logger'
import { pool } from '@/lib/db'
import { isRecord, readJsonBody, sanitizeText } from '@/lib/input-validation'
import { recordAdminAuditEvent } from '@/lib/admin-audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uploadSource = request.headers.get('x-upload-source')

  if (!(await verifyUploadRequest(request))) {
    await appendUploadLog({ type: 'upload_error', error: 'Unauthorized package delete', uploadSource: uploadSource ?? 'missing', ip, userAgent })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body) || typeof body.id !== 'string') return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const id = sanitizeText(body.id)
    if (!id || id.length > 120) return new Response(JSON.stringify({ error: 'Invalid package id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const result = await pool.query('DELETE FROM packages WHERE id = $1 RETURNING name', [id])
    if (!result.rows[0]) return new Response(JSON.stringify({ error: 'Package not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    await recordAdminAuditEvent(request, {
      action: 'deleted',
      entityType: 'packages',
      entityId: id,
      description: `Deleted package ${result.rows[0].name}`,
    })

    await appendUploadLog({ type: 'upload_success', ip, userAgent })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[package-delete] error', err)
    return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
