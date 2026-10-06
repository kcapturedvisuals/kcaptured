import { verifyUploadRequest } from '@/lib/auth-utils'
import { appendUploadLog, getClientIp } from '@/lib/logger'
import { pool } from '@/lib/db'
import { isRecord, readJsonBody, sanitizeText } from '@/lib/input-validation'
import { recordAdminAuditEvent } from '@/lib/admin-audit'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uploadSource = request.headers.get('x-upload-source')

  if (!(await verifyUploadRequest(request))) {
    await appendUploadLog({ type: 'upload_error', error: 'Unauthorized portfolio update', uploadSource: uploadSource ?? 'missing', ip, userAgent })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return new Response(JSON.stringify({ error: 'Invalid portfolio item' }), { status: 400 })
    if (['id', 'category', 'caption', 'title'].some((field) => body[field] != null && typeof body[field] !== 'string'))
      return new Response(JSON.stringify({ error: 'Portfolio text fields must be strings' }), { status: 400 })
    const id = sanitizeText(body.id)
    const category = body.category === undefined ? undefined : sanitizeText(body.category)
    const caption = body.caption === undefined ? undefined : sanitizeText(body.caption)
    const title = body.title === undefined ? undefined : sanitizeText(body.title)
    const { featured, active } = body
    if (!id || id.length > 120 || (category?.length ?? 0) > 80 || (caption?.length ?? 0) > 2000 || (title?.length ?? 0) > 160)
      return new Response(JSON.stringify({ error: 'One or more portfolio fields are invalid or too long' }), { status: 400 })
    if ((featured !== undefined && typeof featured !== 'boolean') || (active !== undefined && typeof active !== 'boolean'))
      return new Response(JSON.stringify({ error: 'Featured and active must be true or false' }), { status: 400 })

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const sets: string[] = []
    const values: any[] = []
    let idx = 1
    if (category !== undefined) { sets.push(`category = $${idx++}`); values.push(category) }
    if (caption !== undefined) { sets.push(`caption = $${idx++}`); values.push(caption) }
    if (featured !== undefined) { sets.push(`featured = $${idx++}`); values.push(Boolean(featured)) }
    if (active !== undefined) { sets.push(`active = $${idx++}`); values.push(Boolean(active)) }
    if (title !== undefined) { sets.push(`title = $${idx++}`); values.push(title) }

    if (sets.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    values.push(id)
    const sql = `UPDATE portfolio_items SET ${sets.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`
    const res = await pool.query(sql, values)
    const row = res?.rows?.[0]
    if (!row) return new Response(JSON.stringify({ error: 'Portfolio item not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    await recordAdminAuditEvent(request, {
      action: 'edited',
      entityType: 'portfolio_items',
      entityId: id,
      description: `Updated portfolio item ${row.title}`,
    })

    await appendUploadLog({ type: 'upload_success', ip, userAgent })

    return new Response(JSON.stringify({ success: true, item: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[portfolio-item][PATCH] error', err)
    return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
