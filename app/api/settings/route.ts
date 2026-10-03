import { pool } from '@/lib/db'
import { verifyUploadToken } from '@/lib/auth-utils'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function isAdmin(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  return Boolean(token && request.headers.get('x-upload-source') === 'kc-upload' && verifyUploadToken(token))
}

function mapRow(row: any) {
  return {
    studioName: row.studio_name,
    email: row.email,
    phone: row.phone,
    instagramHandle: row.instagram_handle,
    bookingEmail: row.booking_email,
    maxConcurrentBookings: row.max_concurrent_bookings,
    heroLabel: row.hero_label ?? 'KCAPTURED VISUALS',
    portfolioView: row.portfolio_view ?? 'current',
    paymentInstructions: row.payment_instructions ?? null,
  }
}

export async function GET(request: Request) {
  try {
    const result = await pool.query('SELECT * FROM site_settings WHERE id = $1', ['site-settings'])
    if (!result.rows[0]) return json({ studioName: 'KCAPTURED Studios', email: null, phone: null, instagramHandle: null, bookingEmail: null, maxConcurrentBookings: 10, heroLabel: 'KCAPTURED VISUALS', portfolioView: 'current', paymentInstructions: null })
    return json(mapRow(result.rows[0]))
  } catch (error) {
    console.error('[settings][GET] error', error)
    return json({ error: 'Failed to load settings' }, 500)
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await request.json()
    const max = Number(body.maxConcurrentBookings ?? 10)
    if (!Number.isInteger(max) || max < 0 || max > 10000) return json({ error: 'Maximum bookings must be a valid number' }, 400)
    const paymentInstructions = String(body.paymentInstructions ?? '').trim().slice(0, 2000) || null
    const result = await pool.query(`INSERT INTO site_settings (id, studio_name, email, phone, instagram_handle, booking_email, max_concurrent_bookings, hero_label, portfolio_view, payment_instructions, created_at, updated_at) VALUES ('site-settings',$1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now()) ON CONFLICT (id) DO UPDATE SET studio_name = EXCLUDED.studio_name, email = EXCLUDED.email, phone = EXCLUDED.phone, instagram_handle = EXCLUDED.instagram_handle, booking_email = EXCLUDED.booking_email, max_concurrent_bookings = EXCLUDED.max_concurrent_bookings, hero_label = EXCLUDED.hero_label, portfolio_view = EXCLUDED.portfolio_view, payment_instructions = EXCLUDED.payment_instructions, updated_at = now() RETURNING *`, [String(body.studioName ?? '').trim() || 'KCAPTURED Studios', body.email || null, body.phone || null, body.instagramHandle || null, body.bookingEmail || null, max, body.heroLabel ?? 'KCAPTURED VISUALS', body.portfolioView ?? 'current', paymentInstructions])
    await pool.query('INSERT INTO audit_logs (id, action, entity_type, description, actor, created_at) VALUES ($1,$2,$3,$4,$5,now())', [randomUUID(), 'settings_updated', 'Settings', 'Updated site settings', 'admin'])
    return json(mapRow(result.rows[0]))
  } catch (error) {
    console.error('[settings][PATCH] error', error)
    return json({ error: 'Failed to save settings' }, 500)
  }
}
