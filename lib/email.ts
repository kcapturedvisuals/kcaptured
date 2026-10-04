import { randomUUID } from 'crypto'
import { CANCELLATION_POLICY, formatSessionDate } from '@/lib/booking-status'
import { createDashboardToken } from '@/lib/client-dashboard-auth'
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
    await logEmailEvent('email_skipped', `Missing RESEND_API_KEY for ${subject}`, entityId)
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
        from: process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('[email] Resend rejected email', { status: response.status })
      await logEmailEvent('email_rejected', `Resend rejected ${subject} (status ${response.status})`, entityId)
      return { ok: false as const, error: detail }
    }
    const result = (await response.json().catch(() => ({}))) as { id?: string }
    await logEmailEvent('email_sent', `${subject} sent${result.id ? ` (Resend ID: ${result.id})` : ''}`, entityId)
    return { ok: true as const, id: result.id }
  } catch (error) {
    console.error('[email] Resend request failed', error)
    await logEmailEvent('email_failed', `Request failed for ${subject}`, entityId)
    return { ok: false as const, error: 'request_failed' }
  }
}

export function getSiteUrl(request?: Request) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL)?.trim()
  if (configured) {
    const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(configured)
      ? configured
      : `https://${configured}`
    let siteUrl: URL
    try {
      siteUrl = new URL(withProtocol)
    } catch {
      throw new Error('NEXT_PUBLIC_SITE_URL must be a valid HTTP or HTTPS URL')
    }
    if (
      !['http:', 'https:'].includes(siteUrl.protocol) ||
      siteUrl.username ||
      siteUrl.password
    ) {
      throw new Error('NEXT_PUBLIC_SITE_URL must be a valid HTTP or HTTPS URL')
    }
    return siteUrl.origin
  }
  if (request) return new URL(request.url).origin
  return 'https://kcapturedstudio.com'
}

export function getAdminUrl() {
  const configured = process.env.ADMIN_BASE_URL?.trim() || 'https://admin.kcapturedstudio.com'
  let adminUrl: URL
  try {
    adminUrl = new URL(configured)
  } catch {
    throw new Error('ADMIN_BASE_URL must be a valid HTTPS URL')
  }
  if (adminUrl.protocol !== 'https:' || adminUrl.username || adminUrl.password)
    throw new Error('ADMIN_BASE_URL must be a valid HTTPS URL')
  return adminUrl.origin
}

export function clientDashboardUrl(siteUrl: string, email: string) {
  const token = createDashboardToken(email)
  return `${siteUrl}/dashboard/access/${encodeURIComponent(token)}`
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
<p>Use your private dashboard link to see your booking history, check your booking status, or manage cancellations.</p>
${button(data.link, 'Open your booking dashboard')}
<p style="font-size:13px;color:#a1a1aa">This private link gives access to bookings for this email address and expires after 24 hours.</p>`,
  )
  const text = `Thanks, ${data.clientName}. We received your booking request for ${data.packageName || 'a session'} on ${formatSessionDate(data.preferredDate)}. Open your booking dashboard (link expires after 24 hours): ${data.link}`
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
${button(data.link, 'Open your booking dashboard')}
<p style="font-size:13px;color:#a1a1aa">This private link expires after 24 hours.</p>`,
  )
  const text = `Hi ${data.clientName}, ${cancelledBy} ${data.packageName || 'Session'} on ${formatSessionDate(data.preferredDate)}. Open your booking dashboard (link expires after 24 hours): ${data.link}`
  return { subject, html, text }
}

export function bookingConfirmedEmail(data: BookingEmailData & { paymentInstructions: string; packagePrice: number | null }) {
  const subject = 'Your session is confirmed'
  const paymentHtml = escapeHtml(data.paymentInstructions).replace(/\n/g, '<br>')
  const total = data.packagePrice == null ? null : Math.max(0, data.packagePrice)
  const deposit = total == null ? 20 : Math.min(20, total)
  const remaining = total == null ? null : Math.max(0, total - deposit)
  const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  const amountHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0a0a0a;border:1px solid #27272a;border-radius:12px;margin:8px 0">
<tr><td style="padding:12px 16px;color:#a1a1aa;font-size:13px">Session total</td><td style="padding:12px 16px;text-align:right">${total == null ? 'To be confirmed' : escapeHtml(money(total))}</td></tr>
<tr><td style="padding:12px 16px;color:#a1a1aa;font-size:13px;border-top:1px solid #27272a">Deposit to hold date</td><td style="padding:12px 16px;text-align:right;border-top:1px solid #27272a">${escapeHtml(money(deposit))}</td></tr>
<tr><td style="padding:12px 16px;color:#a1a1aa;font-size:13px;border-top:1px solid #27272a">Remaining balance (due session day)</td><td style="padding:12px 16px;text-align:right;border-top:1px solid #27272a">${remaining == null ? 'To be confirmed' : escapeHtml(money(remaining))}</td></tr>
</table>`
  const html = layout(
    'Your date is verified',
    `<p>Hi ${escapeHtml(data.clientName)}, your session is confirmed.</p>
${summary(data.packageName, data.preferredDate)}
${amountHtml}
<p style="font-weight:600;color:#ffffff;padding-top:8px">Payment</p>
<p>1. Pay the deposit shown above to hold your date.<br>2. Choose one of the payment options below.<br>3. Include your name and session date with your payment.<br>4. Pay the remaining balance on the day of your session.</p>
<p>${paymentHtml}</p>
<p style="font-size:13px;color:#a1a1aa">${escapeHtml(CANCELLATION_POLICY)}</p>
${button(data.link, 'Open your booking dashboard')}`,
  )
  const text = `Hi ${data.clientName}, your session (${data.packageName || 'session'}) on ${formatSessionDate(data.preferredDate)} is confirmed.\n\nSession total: ${total == null ? 'To be confirmed' : money(total)}\nDeposit to hold date: ${money(deposit)}\nRemaining balance due on session day: ${remaining == null ? 'To be confirmed' : money(remaining)}\n\nPayment steps:\n1. Pay the deposit shown above to hold your date.\n2. Choose one of the payment options below.\n3. Include your name and session date with your payment.\n4. Pay the remaining balance on the day of your session.\n\nPayment options and details:\n${data.paymentInstructions}\n\n${CANCELLATION_POLICY}\n\nOpen your booking dashboard: ${data.link}`
  return { subject, html, text }
}

export function bookingDashboardEmail(link: string) {
  const subject = 'Your KCAPTURED booking dashboard link'
  const html = layout(
    'Your bookings',
    `<p>Use this secure link to view your booking history, manage eligible cancellations, and find the Google review link.</p>
${button(link, 'Open your booking dashboard')}
<p style="font-size:13px;color:#a1a1aa">This link expires after 24 hours. You can request another from the booking page.</p>`,
  )
  const text = `Open your KCAPTURED booking dashboard to view your booking history, manage eligible cancellations, and find the Google review link: ${link}\n\nThis link expires after 24 hours. You can request another from the booking page.`
  return { subject, html, text }
}

export function adminPasswordResetEmail(username: string, resetUrl: string) {
  const subject = 'Reset your KCAPTURED admin password'
  const html = layout(
    'Admin password reset',
    `<p>A password reset was requested for the <strong>${escapeHtml(username)}</strong> admin account.</p>
<p>This one-time link expires in 30 minutes and can only be used once.</p>
${button(resetUrl, 'Reset admin password')}
<p style="font-size:13px;color:#a1a1aa">If you did not request this, you can ignore this email. Do not forward this private link.</p>`,
  )
  const text = `A password reset was requested for the ${username} admin account. This one-time link expires in 30 minutes and can only be used once: ${resetUrl}\n\nIf you did not request this, ignore this email.`
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
