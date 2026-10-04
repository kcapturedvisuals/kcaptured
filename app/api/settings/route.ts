import { pool } from '@/lib/db'
import { adminSessionFromRequest, verifyUploadRequest } from '@/lib/auth-utils'
import { isRecord, isValidEmail, readJsonBody, sanitizePhone, sanitizeText } from '@/lib/input-validation'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function isAdmin(request: Request) {
  return verifyUploadRequest(request)
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
  if (!(await isAdmin(request))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return json({ error: 'Invalid settings' }, 400)
    const max = Number(body.maxConcurrentBookings ?? 10)
    if (!Number.isInteger(max) || max < 0 || max > 10000) return json({ error: 'Maximum bookings must be a valid number' }, 400)
    const stringFields = ['studioName', 'email', 'phone', 'instagramHandle', 'bookingEmail', 'heroLabel', 'portfolioView', 'paymentInstructions']
    if (stringFields.some((field) => body[field] != null && typeof body[field] !== 'string'))
      return json({ error: 'Settings fields must be text' }, 400)
    const studioName = sanitizeText(body.studioName) || 'KCAPTURED Studios'
    const email = sanitizeText(body.email).toLowerCase()
    const phone = sanitizePhone(body.phone)
    const instagramHandle = sanitizeText(body.instagramHandle)
    const bookingEmail = sanitizeText(body.bookingEmail).toLowerCase()
    const heroLabel = sanitizeText(body.heroLabel) || 'KCAPTURED VISUALS'
    const portfolioView = sanitizeText(body.portfolioView) || 'current'
    const paymentInstructions = sanitizeText(body.paymentInstructions) || null
    if (
      studioName.length > 120 || email.length > 254 || bookingEmail.length > 254 ||
      instagramHandle.length > 80 || heroLabel.length > 120 || portfolioView.length > 40 ||
      (paymentInstructions?.length ?? 0) > 2000 || phone === null || (phone?.length ?? 0) > 40
    ) return json({ error: 'One or more settings exceed the allowed length or format' }, 400)
    if ((email && !isValidEmail(email)) || (bookingEmail && !isValidEmail(bookingEmail)))
      return json({ error: 'Enter a valid settings email address' }, 400)
    if (instagramHandle && !/^@?[A-Za-z0-9._]{1,30}$/.test(instagramHandle))
      return json({ error: 'Enter a valid Instagram handle' }, 400)
    if (!['current', 'masonry'].includes(portfolioView))
      return json({ error: 'Choose a valid portfolio view' }, 400)
    const result = await pool.query(`INSERT INTO site_settings (id, studio_name, email, phone, instagram_handle, booking_email, max_concurrent_bookings, hero_label, portfolio_view, payment_instructions, created_at, updated_at) VALUES ('site-settings',$1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now()) ON CONFLICT (id) DO UPDATE SET studio_name = EXCLUDED.studio_name, email = EXCLUDED.email, phone = EXCLUDED.phone, instagram_handle = EXCLUDED.instagram_handle, booking_email = EXCLUDED.booking_email, max_concurrent_bookings = EXCLUDED.max_concurrent_bookings, hero_label = EXCLUDED.hero_label, portfolio_view = EXCLUDED.portfolio_view, payment_instructions = EXCLUDED.payment_instructions, updated_at = now() RETURNING *`, [studioName, email || null, phone || null, instagramHandle || null, bookingEmail || null, max, heroLabel, portfolioView, paymentInstructions])
    const session = await adminSessionFromRequest(request)
    if (!session) return json({ error: 'Unauthorized' }, 401)
    await pool.query('INSERT INTO audit_logs (id, action, entity_type, description, actor, created_at) VALUES ($1,$2,$3,$4,$5,now())', [randomUUID(), 'settings_updated', 'Settings', 'Updated site settings', session.username])
    return json(mapRow(result.rows[0]))
  } catch (error) {
    console.error('[settings][PATCH] error', error)
    return json({ error: 'Failed to save settings' }, 500)
  }
}
