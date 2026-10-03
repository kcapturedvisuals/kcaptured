import { v2 as cloudinary } from 'cloudinary'
import { appendUploadLog, getClientIp } from '@/lib/logger'
import { verifyUploadRequest } from '@/lib/auth-utils'
import db, { pool } from '@/lib/db'
import { isRecord, readJsonBody, sanitizeText } from '@/lib/input-validation'

export const runtime = 'nodejs'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uploadSource = request.headers.get('x-upload-source')

  if (!verifyUploadRequest(request)) {
    await appendUploadLog({
      type: 'upload_error',
      error: 'Unauthorized portfolio delete request',
      uploadSource: uploadSource ?? 'missing',
      ip,
      userAgent,
    })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const body = await readJsonBody(request)
    if (!isRecord(body) || (body.id != null && typeof body.id !== 'string') || (body.publicId != null && typeof body.publicId !== 'string'))
      return new Response(JSON.stringify({ error: 'Invalid portfolio delete request' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    let id = sanitizeText(body.id)
    let publicId = sanitizeText(body.publicId)
    if (id.length > 120 || publicId.length > 255)
      return new Response(JSON.stringify({ error: 'Portfolio identifier is too long' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    if (!id && !publicId) {
      return new Response(JSON.stringify({ error: 'Missing id or publicId' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    if (id && !publicId) {
      const existing = await pool.query('SELECT public_id FROM portfolio_items WHERE id = $1', [id])
      publicId = existing.rows[0]?.public_id
    }

    if (publicId && process.env.CLOUDINARY_API_KEY) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
      } catch (cloudErr) {
        console.warn('[portfolio-delete] Cloudinary delete failed', cloudErr)
      }
    }

    // Remove DB record when present
    try {
      if (id) {
        await pool.query('DELETE FROM portfolio_items WHERE id = $1', [id])
      } else if (publicId) {
        await pool.query('DELETE FROM portfolio_items WHERE public_id = $1', [publicId])
      }
    } catch (dbErr) {
      console.warn('[portfolio-delete] DB delete failed', dbErr)
    }

    await appendUploadLog({ type: 'upload_delete', publicId: publicId ?? id, ip, userAgent })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[portfolio-delete] error', err)
    return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
