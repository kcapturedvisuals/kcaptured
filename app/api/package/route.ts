import { verifyUploadRequest } from '@/lib/auth-utils'
import { appendUploadLog, getClientIp } from '@/lib/logger'
import { pool } from '@/lib/db'
import { isRecord, readJsonBody, sanitizeHttpUrl, sanitizeText } from '@/lib/input-validation'
import { recordAdminAuditEvent } from '@/lib/admin-audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uploadSource = request.headers.get('x-upload-source')

  if (!(await verifyUploadRequest(request))) {
    await appendUploadLog({ type: 'upload_error', error: 'Unauthorized package create', uploadSource: uploadSource ?? 'missing', ip, userAgent })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return new Response(JSON.stringify({ error: 'Invalid package' }), { status: 400 })
    if (['id', 'category', 'name', 'duration', 'description', 'sampleUrl'].some((field) => body[field] != null && typeof body[field] !== 'string'))
      return new Response(JSON.stringify({ error: 'Package text fields must be strings' }), { status: 400 })
    const id = sanitizeText(body.id)
    const category = sanitizeText(body.category)
    const name = sanitizeText(body.name)
    const duration = sanitizeText(body.duration)
    const description = sanitizeText(body.description)
    const sampleUrl = body.sampleUrl ? sanitizeHttpUrl(body.sampleUrl) : ''
    const price = Number(body.price ?? 0)
    const editedImages = body.editedImages == null ? null : Number(body.editedImages)
    const features = body.features ?? []
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing required field: id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (!category) {
      return new Response(JSON.stringify({ error: 'Missing required field: category' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing required field: name' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (
      id.length > 120 || category.length > 80 || name.length > 120 || duration.length > 80 ||
      description.length > 2000 || !Number.isSafeInteger(price) || price < 0 || price > 1000000 ||
      (editedImages !== null && (!Number.isInteger(editedImages) || editedImages < 0 || editedImages > 10000)) ||
      sampleUrl === null || sampleUrl.length > 2048 ||
      !Array.isArray(features) || features.length > 100 ||
      features.some((feature) => typeof feature !== 'string' || sanitizeText(feature).length > 300)
    ) return new Response(JSON.stringify({ error: 'One or more package fields are invalid or too long' }), { status: 400 })

    const sql = `INSERT INTO packages (id, category, name, duration, price, features, description, edited_images, sample_url, sort_order, active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now()) RETURNING *`
    // set sort_order to a high number to append
    const params = [id, category, name, duration || null, price, JSON.stringify(features.map((feature) => sanitizeText(feature))), description || null, editedImages, sampleUrl || null, 9999, true]
    const res = await pool.query(sql, params)
    const row = res?.rows?.[0]
    await recordAdminAuditEvent(request, {
      action: 'created',
      entityType: 'packages',
      entityId: id,
      description: `Created package ${name}`,
    })

    await appendUploadLog({ type: 'upload_success', ip, userAgent })

    return new Response(JSON.stringify({ success: true, item: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[package][POST] error', err)
    await appendUploadLog({ type: 'upload_error', error: `Create failed: ${errorMsg}`, ip, userAgent })
    return new Response(JSON.stringify({ error: 'Create failed', details: errorMsg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function PATCH(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uploadSource = request.headers.get('x-upload-source')

  if (!(await verifyUploadRequest(request))) {
    await appendUploadLog({ type: 'upload_error', error: 'Unauthorized package update', uploadSource: uploadSource ?? 'missing', ip, userAgent })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return new Response(JSON.stringify({ error: 'Invalid package' }), { status: 400 })
    if (['id', 'category', 'name', 'duration', 'description', 'sampleUrl'].some((field) => body[field] != null && typeof body[field] !== 'string'))
      return new Response(JSON.stringify({ error: 'Package text fields must be strings' }), { status: 400 })
    const id = sanitizeText(body.id)
    const { category, name, duration, price, features, sampleUrl, active, description, editedImages } = body
    if (!id || id.length > 120) {
      return new Response(JSON.stringify({ error: 'Missing required field: id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const sets = []
    const vals = []
    let idx = 1
    const addText = (field: unknown, column: string, maxLength: number, nullable = false) => {
      if (field === undefined) return true
      if (field !== null && typeof field !== 'string') return false
      const value = sanitizeText(field)
      if (value.length > maxLength) return false
      sets.push(`${column} = $${idx++}`)
      vals.push(nullable && !value ? null : value)
      return true
    }
    if (
      !addText(category, 'category', 80) ||
      !addText(name, 'name', 120) ||
      !addText(duration, 'duration', 80, true) ||
      !addText(description, 'description', 2000, true)
    ) return new Response(JSON.stringify({ error: 'One or more package fields are invalid or too long' }), { status: 400 })
    if (price !== undefined) {
      const parsedPrice = Number(price)
      if (!Number.isSafeInteger(parsedPrice) || parsedPrice < 0 || parsedPrice > 1000000) return new Response(JSON.stringify({ error: 'Package price is invalid' }), { status: 400 })
      sets.push(`price = $${idx++}`); vals.push(parsedPrice)
    }
    if (features !== undefined) {
      if (!Array.isArray(features) || features.length > 100 || features.some((feature) => typeof feature !== 'string' || sanitizeText(feature).length > 300))
        return new Response(JSON.stringify({ error: 'Package features are invalid' }), { status: 400 })
      sets.push(`features = $${idx++}`); vals.push(JSON.stringify(features.map((feature) => sanitizeText(feature))))
    }
    if (editedImages !== undefined) {
      const parsed = editedImages == null ? null : Number(editedImages)
      if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000)) return new Response(JSON.stringify({ error: 'Edited image count is invalid' }), { status: 400 })
      sets.push(`edited_images = $${idx++}`); vals.push(parsed)
    }
    if (sampleUrl !== undefined) {
      const url = sampleUrl ? sanitizeHttpUrl(sampleUrl) : null
      if (url === null && sampleUrl) return new Response(JSON.stringify({ error: 'Sample URL must be a valid HTTP URL' }), { status: 400 })
      if (typeof sampleUrl !== 'string' || (url?.length ?? 0) > 2048) return new Response(JSON.stringify({ error: 'Sample URL is invalid' }), { status: 400 })
      sets.push(`sample_url = $${idx++}`); vals.push(url)
    }
    if (active !== undefined) {
      if (typeof active !== 'boolean') return new Response(JSON.stringify({ error: 'Active must be true or false' }), { status: 400 })
      sets.push(`active = $${idx++}`); vals.push(active)
    }

    if (sets.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields provided to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    vals.push(id)
    const sql = `UPDATE packages SET ${sets.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`
    const res = await pool.query(sql, vals)
    const row = res?.rows?.[0]
    await recordAdminAuditEvent(request, {
      action: 'edited',
      entityType: 'packages',
      entityId: id,
      description: `Updated package ${row?.name ?? id}`,
    })

    await appendUploadLog({ type: 'upload_success', ip, userAgent })

    return new Response(JSON.stringify({ success: true, item: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[package][PATCH] error', err)
    await appendUploadLog({ type: 'upload_error', error: `Update failed: ${errorMsg}`, ip, userAgent })
    return new Response(JSON.stringify({ error: 'Update failed', details: errorMsg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
