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
    await appendUploadLog({ type: 'upload_error', error: 'Unauthorized package reorder', uploadSource: uploadSource ?? 'missing', ip, userAgent })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body) || !Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 500 ||
      body.ids.some((id) => typeof id !== 'string' || !sanitizeText(id) || sanitizeText(id).length > 120)) {
      return new Response(JSON.stringify({ error: 'Missing ids array' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const ids = body.ids.map((id) => sanitizeText(id))

    const cases: string[] = []
    const params: any[] = []
    ids.forEach((id, i) => {
      cases.push(`WHEN $${i + 1} THEN ${i + 1}`)
      params.push(id)
    })

    const sql = `UPDATE packages SET sort_order = CASE id ${cases.join(' ')} END, updated_at = now() WHERE id = ANY($${params.length + 1}::text[])`
    params.push(ids)

    await pool.query('BEGIN')
    await pool.query(sql, params)
    await pool.query('COMMIT')
    await recordAdminAuditEvent(request, {
      action: 'edited',
      entityType: 'packages',
      description: `Reordered ${ids.length} packages`,
    })

    await appendUploadLog({ type: 'upload_success', ip, userAgent })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    try { await pool.query('ROLLBACK') } catch (_) {}
    console.error('[package-reorder] error', err)
    return new Response(JSON.stringify({ error: 'Reorder failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
