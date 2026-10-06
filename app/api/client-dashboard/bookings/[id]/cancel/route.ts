import { pool } from '@/lib/db'
import { dashboardEmailFromRequest } from '@/lib/client-dashboard-auth'
import { canClientCancel } from '@/lib/booking-status'
import {
  adminNotificationEmail,
  bookingCancelledEmail,
  clientDashboardUrl,
  getAdminUrl,
  getSiteUrl,
  sendEmail,
} from '@/lib/email'
import { sanitizeText } from '@/lib/input-validation'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ error: 'Invalid request origin' }, 403)
  }

  const email = dashboardEmailFromRequest(request)
  if (!email) return json({ error: 'Your dashboard link has expired. Request a new one.' }, 401)

  const { id } = await params
  const bookingId = sanitizeText(id)
  if (!bookingId || bookingId.length > 120) return json({ error: 'Booking not found' }, 404)
  try {
    const existing = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND lower(email) = $2 LIMIT 1',
      [bookingId, email],
    )
    const booking = existing.rows[0]
    if (!booking) return json({ error: 'Booking not found' }, 404)

    const check = canClientCancel(booking.status, booking.preferred_date)
    if (!check.allowed) return json({ error: check.reason }, 409)

    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client', updated_at = now()
       WHERE id = $1 AND lower(email) = $2 AND status <> 'cancelled' RETURNING *`,
      [bookingId, email],
    )
    const row = result.rows[0]
    if (!row) return json({ error: 'This booking has already been cancelled.' }, 409)

    const settingsResult = await pool.query(
      'SELECT booking_email FROM site_settings LIMIT 1',
    )
    const siteUrl = getSiteUrl(request)
    const clientMessage = bookingCancelledEmail({
      clientName: row.client_name,
      packageName: row.package_name ?? '',
      preferredDate: row.preferred_date,
      link: clientDashboardUrl(siteUrl, email),
      cancelledBy: 'client',
    })
    const delivery = await sendEmail({
      to: email,
      ...clientMessage,
      idempotencyKey: `booking-cancelled-${row.id}`,
    })
    if (delivery.ok) {
      await pool.query(
        'UPDATE bookings SET cancellation_email_sent_at = COALESCE(cancellation_email_sent_at, now()) WHERE id = $1',
        [row.id],
      )
    }

    const bookingEmail = settingsResult.rows[0]?.booking_email
    if (bookingEmail) {
      const adminMessage = adminNotificationEmail('cancelled', {
        clientName: row.client_name,
        email,
        phone: row.phone ?? '',
        packageName: row.package_name ?? '',
        preferredDate: row.preferred_date,
        adminUrl: `${getAdminUrl()}/admin`,
      })
      await sendEmail({
        to: bookingEmail,
        ...adminMessage,
        idempotencyKey: `booking-admin-cancel-${row.id}`,
      })
    }

    return json({ ok: true })
  } catch (error) {
    console.error('[client-dashboard][cancel] error', error)
    return json({ error: 'Failed to cancel booking' }, 500)
  }
}
