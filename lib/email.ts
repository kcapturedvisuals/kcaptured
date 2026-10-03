import { randomUUID } from 'crypto'
import { CANCELLATION_POLICY, formatSessionDate } from '@/lib/booking-status'
import { pool } from '@/lib/db'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'KCAPTURED Studios <bookings@mail.kcapturedstudio.com>'

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey?: string
  replyTo?: string | null
}

async function logEmailEvent(action: string, description: string, entityId?: string | null, actor = 'system') {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, description, actor)
       VALUES ($1, $2, 'email', $3, $4, $5)`,
      [randomUUID(), action, entityId ?? null, description.slice(0, 2000), actor],
    )
  } catch (error) {
    console.error('[email] failed to write delivery log', error)
  }
}

export async function sendEmail({ to, subject, html, text, idempotencyKey, replyTo }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const entityId = idempotencyKey ?? null
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set; skipping email', { subject })
    await logEmailEvent('email_skipped', `Missing RESEND_API_KEY for ${subject} to ${to}`, entityId)
    return { ok: false as const, error: 'missing_api_key' }
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('[email] Resend rejected email', { status: response.status, detail })
      await logEmailEvent('email_rejected', `Resend rejected ${subject} to ${to}: ${detail}`, entityId)
      return { ok: false as const, error: detail }
    }
    const result = (await response.json().catch(() => ({}))) as { id?: string }
    await logEmailEvent('email_sent', `${subject} sent to ${to}${result.id ? ` (Resend ID: ${result.id})` : ''}`, entityId)
    return { ok: true as const, id: result.id }
  } catch (error) {
    console.error('[email] Resend request failed', error)
    await logEmailEvent('email_failed', `Request failed for ${subject} to ${to}: ${error instanceof Error ? error.message : 'unknown error'}`, entityId)
    return { ok: false as const, error: 'request_failed' }
  }
}

export function getSiteUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  if (configured) return configured
  if (request) return new URL(request.url).origin
  return 'https://kcapturedstudio.com'
}

export function manageUrl(siteUrl: string, token: string) {
  return `${siteUrl}/booking/${encodeURIComponent(token)}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#f4f4f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141414;border:1px solid #27272a;border-radius:20px;padding:32px">
<tr><td style="font-size:12px;letter-spacing:4px;color:#a1a1aa;padding-bottom:16px">KCAPTURED STUDIOS</td></tr>
<tr><td style="font-size:24px;font-weight:700;padding-bottom:16px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#d4d4d8">${body}</td></tr>
</table></td></tr></table></body></html>`
}

function button(href: string, label: string) {
  return `<p style="padding:16px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#951025;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">${escapeHtml(label)}</a></p>`
}

function summary(packageName: string, preferredDate: Date | string | null) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0a0a0a;border:1px solid #27272a;border-radius:12px;margin:8px 0">
<tr><td style="padding:12px 16px;color:#a1a1aa;font-size:13px">Package</td><td style="padding:12px 16px;text-align:right">${escapeHtml(packageName || 'To be discussed')}</td></tr>
<tr><td style="padding:12px 16px;color:#a1a1aa;font-size:13px;border-top:1px solid #27272a">Preferred date</td><td style="padding:12px 16px;text-align:right;border-top:1px solid #27272a">${escapeHtml(formatSessionDate(preferredDate))}</td></tr>
</table>`
}

interface BookingEmailData {
  clientName: string
  packageName: string
  preferredDate: Date | string | null
  link: string
}

export function bookingReceivedEmail(data: BookingEmailData) {
  const subject = 'We received your booking request'
  const html = layout(
    `Thanks, ${data.clientName}`,
    `<p>Your booking request is in. We will review the date and email you once it is verified.</p>
${summary(data.packageName, data.preferredDate)}
<p>Use the link below any time to check your booking status or cancel.</p>
${button(data.link, 'Manage your booking')}
<p style="font-size:13px;color:#a1a1aa">Keep this email. Anyone with this link can view and cancel this booking.</p>`,
  )
  const text = `Thanks, ${data.clientName}. We received your booking request for ${data.packageName || 'a session'} on ${formatSessionDate(data.preferredDate)}. Manage your booking: ${data.link}`
  return { subject, html, text }
}

export function bookingCancelledEmail(data: BookingEmailData & { cancelledBy?: 'admin' | 'client' }) {
  const subject = 'Update to your booking request'
  const cancelledBy = data.cancelledBy === 'client' ? 'Your booking was cancelled as requested.' : 'Your booking request was cancelled by the studio.'
  const html = layout(
    'Booking cancelled',
    `<p>Hi ${escapeHtml(data.clientName)}, ${cancelledBy}</p>
${summary(data.packageName, data.preferredDate)}
<p>If you still need a session, you can submit a new request at any time.</p>
${button(data.link, 'View booking details')}`,
  )
  const text = `Hi ${data.clientName}, ${cancelledBy} ${data.packageName || 'Session'} on ${formatSessionDate(data.preferredDate)}. View details: ${data.link}`
  return { subject, html, text }
}

export function bookingConfirmedEmail(data: BookingEmailData & { paymentInstructions: string }) {
  const subject = 'Your session is confirmed'
  const paymentHtml = escapeHtml(data.paymentInstructions).replace(/\n/g, '<br>')
  const html = layout(
    'Your date is verified',
    `<p>Hi ${escapeHtml(data.clientName)}, your session is confirmed.</p>
${summary(data.packageName, data.preferredDate)}
<p style="font-weight:600;color:#ffffff;padding-top:8px">Payment</p>
<p>${paymentHtml}</p>
<p style="font-size:13px;color:#a1a1aa">${escapeHtml(CANCELLATION_POLICY)}</p>
${button(data.link, 'View your booking')}`,
  )
  const text = `Hi ${data.clientName}, your session (${data.packageName || 'session'}) on ${formatSessionDate(data.preferredDate)} is confirmed.\n\nPayment:\n${data.paymentInstructions}\n\n${CANCELLATION_POLICY}\n\nView your booking: ${data.link}`
  return { subject, html, text }
}

export function bookingLinksEmail(links: { packageName: string; preferredDate: Date | string | null; link: string }[]) {
  const subject = 'Your KCAPTURED booking links'
  const items = links
    .map(
      (item) =>
        `<p style="margin:0 0 12px"><a href="${escapeHtml(item.link)}" style="color:#ffffff">${escapeHtml(item.packageName || 'Session')} &middot; ${escapeHtml(formatSessionDate(item.preferredDate))}</a></p>`,
    )
    .join('')
  const html = layout('Your bookings', `<p>Here are the links to manage your bookings:</p>${items}`)
  const text = `Your bookings:\n${links.map((item) => `${item.packageName || 'Session'} - ${formatSessionDate(item.preferredDate)}: ${item.link}`).join('\n')}`
  return { subject, html, text }
}

export function adminNotificationEmail(kind: 'new' | 'cancelled', data: { clientName: string; email: string; phone: string; packageName: string; preferredDate: Date | string | null; adminUrl: string }) {
  const subject = kind === 'new' ? `New booking request: ${data.clientName}` : `Booking cancelled by client: ${data.clientName}`
  const html = layout(
    kind === 'new' ? 'New booking request' : 'Booking cancelled',
    `<p>${escapeHtml(data.clientName)} &middot; ${escapeHtml(data.email || 'no email')} &middot; ${escapeHtml(data.phone || 'no phone')}</p>
${summary(data.packageName, data.preferredDate)}
${button(data.adminUrl, 'Open admin')}`,
  )
  const text = `${subject}\n${data.email} ${data.phone}\n${data.packageName} on ${formatSessionDate(data.preferredDate)}\n${data.adminUrl}`
  return { subject, html, text }
}
