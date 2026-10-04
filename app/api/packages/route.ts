import { pool } from '@/lib/db'
import { verifyUploadRequest } from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true'
    if (includeInactive && !(await verifyUploadRequest(request))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const activeClause = includeInactive ? '' : ' WHERE active = true'
    const res = await pool.query(`SELECT id, category, name, duration, price, features, description, edited_images, sample_url, sort_order, active FROM packages${activeClause} ORDER BY sort_order ASC`)
    const rows = (res?.rows ?? []).map((r: any) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      duration: r.duration,
      price: r.price,
      features: r.features || [],
      description: r.description,
      editedImages: r.edited_images,
      sampleUrl: r.sample_url || null,
      sortOrder: r.sort_order,
      active: r.active,
    }))

    return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[packages][GET] error', err)
    return new Response(JSON.stringify({ error: 'Failed to load packages' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
