import { randomUUID } from 'crypto'
import { pool } from '@/lib/db'
import { verifyUploadRequest } from '@/lib/auth-utils'
import { isRecord, isValidIsoDate, readJsonBody, sanitizeHttpUrl, sanitizeText } from '@/lib/input-validation'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function isAdmin(request: Request) {
  return verifyUploadRequest(request)
}

function mapRow(row: any) {
  return { id: row.id, clientName: row.client_name, clientRole: row.client_role, content: row.content, videoUrl: row.video_url, videoPublicId: row.video_public_id, imageUrl: row.image_url, rating: row.rating, published: row.published, date: row.testimonial_date ?? String(row.created_at).slice(0, 10), createdAt: row.created_at }
}

function validate(body: unknown, partial = false) {
  if (!isRecord(body)) return 'Invalid testimonial'
  const textFields: Array<[string, number]> = [
    ['clientName', 120],
    ['clientRole', 120],
    ['content', 5000],
    ['date', 40],
    ['videoPublicId', 255],
  ]
  for (const [field, maxLength] of textFields) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string')
      return 'Testimonial fields must be text'
    if (typeof body[field] === 'string' && sanitizeText(body[field]).length > maxLength)
      return `${field} is too long`
  }
  if (!partial && (!sanitizeText(body.clientName) || !sanitizeText(body.content))) return 'Client name and testimonial content are required'
  if (body.rating !== undefined && (!Number.isInteger(Number(body.rating)) || Number(body.rating) < 1 || Number(body.rating) > 5)) return 'Rating must be between 1 and 5'
  for (const field of ['videoUrl', 'imageUrl']) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string')
      return 'Media URLs must be text'
    if (body[field]) {
      const url = sanitizeHttpUrl(body[field])
      if (!url || url.length > 2048) return 'Enter a valid media URL'
    }
  }
  if (body.published !== undefined && typeof body.published !== 'boolean') return 'Published must be true or false'
  return null
}

export async function GET(request: Request) {
  try {
    const includeDrafts = new URL(request.url).searchParams.get('includeDrafts') === 'true' && await isAdmin(request)
    const result = await pool.query(`SELECT * FROM testimonials${includeDrafts ? '' : ' WHERE published = true'} ORDER BY created_at DESC`)
    return json(result.rows.map(mapRow))
  } catch (error) {
    console.error('[testimonials][GET] error', error)
    return json({ error: 'Failed to load testimonials' }, 500)
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await readJsonBody(request)
    const validationError = validate(body)
    if (validationError) return json({ error: validationError }, 400)
    if (!isRecord(body)) return json({ error: 'Invalid testimonial' }, 400)
    if (body.date && !isValidIsoDate(sanitizeText(body.date)))
      return json({ error: 'Enter a valid testimonial date' }, 400)
    const result = await pool.query(
      `INSERT INTO testimonials (id, client_name, client_role, content, testimonial_date, video_url, video_public_id, image_url, rating, published, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) RETURNING *`,
      [randomUUID(), sanitizeText(body.clientName), sanitizeText(body.clientRole) || null, sanitizeText(body.content), sanitizeText(body.date) || null, body.videoUrl ? sanitizeHttpUrl(body.videoUrl) : null, sanitizeText(body.videoPublicId) || null, body.imageUrl ? sanitizeHttpUrl(body.imageUrl) : null, Number(body.rating ?? 5), body.published ?? false],
    )
    return json({ testimonial: mapRow(result.rows[0]) }, 201)
  } catch (error) {
    console.error('[testimonials][POST] error', error)
    return json({ error: 'Failed to create testimonial' }, 500)
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return json({ error: 'Invalid testimonial' }, 400)
    if (typeof body.id !== 'string' || !sanitizeText(body.id) || sanitizeText(body.id).length > 120) return json({ error: 'Missing id' }, 400)
    const validationError = validate(body, true)
    if (validationError) return json({ error: validationError }, 400)
    if (body.date && !isValidIsoDate(sanitizeText(body.date)))
      return json({ error: 'Enter a valid testimonial date' }, 400)
    const fields: string[] = []
    const values: unknown[] = []
    const add = (column: string, value: unknown) => { fields.push(`${column} = $${fields.length + 1}`); values.push(value) }
    if (body.clientName !== undefined) add('client_name', sanitizeText(body.clientName))
    if (body.clientRole !== undefined) add('client_role', sanitizeText(body.clientRole) || null)
    if (body.content !== undefined) add('content', sanitizeText(body.content))
    if (body.date !== undefined) add('testimonial_date', sanitizeText(body.date) || null)
    if (body.videoUrl !== undefined) add('video_url', body.videoUrl ? sanitizeHttpUrl(body.videoUrl) : null)
    if (body.videoPublicId !== undefined) add('video_public_id', sanitizeText(body.videoPublicId) || null)
    if (body.imageUrl !== undefined) add('image_url', body.imageUrl ? sanitizeHttpUrl(body.imageUrl) : null)
    if (body.rating !== undefined) add('rating', Number(body.rating))
    if (body.published !== undefined) add('published', body.published)
    if (!fields.length) return json({ error: 'No fields provided' }, 400)
    values.push(sanitizeText(body.id))
    const result = await pool.query(`UPDATE testimonials SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values)
    if (!result.rows[0]) return json({ error: 'Testimonial not found' }, 404)
    return json({ testimonial: mapRow(result.rows[0]) })
  } catch (error) {
    console.error('[testimonials][PATCH] error', error)
    return json({ error: 'Failed to update testimonial' }, 500)
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin(request))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return json({ error: 'Invalid testimonial' }, 400)
    if (typeof body.id !== 'string' || !sanitizeText(body.id) || sanitizeText(body.id).length > 120) return json({ error: 'Missing id' }, 400)
    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING id', [sanitizeText(body.id)])
    if (!result.rows[0]) return json({ error: 'Testimonial not found' }, 404)
    return json({ success: true })
  } catch (error) {
    console.error('[testimonials][DELETE] error', error)
    return json({ error: 'Failed to delete testimonial' }, 500)
  }
}
