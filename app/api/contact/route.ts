import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isRecord, isValidEmail, readJsonBody, sanitizeText } from '@/lib/input-validation'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`contact:${getClientIp(request)}`, 5, 60 * 60 * 1000)
  if (!rate.allowed) return json({ error: 'Too many messages. Please try again later.' }, 429)

  try {
    const body: unknown = await readJsonBody(request, 16 * 1024)
    if (!isRecord(body)) return json({ error: 'Invalid contact form submission' }, 400)
    if (typeof body.website === 'string' && sanitizeText(body.website)) return json({ ok: true })
    if (['name', 'email', 'subject', 'message'].some((field) => body[field] != null && typeof body[field] !== 'string'))
      return json({ error: 'Contact fields must be text' }, 400)

    const name = sanitizeText(body.name)
    const email = sanitizeText(body.email).toLowerCase()
    const subject = sanitizeText(body.subject) || 'Photography Inquiry'
    const message = sanitizeText(body.message)
    if (!name || !email || !message || !isValidEmail(email))
      return json({ error: 'Enter a valid name, email address, and message' }, 400)
    if (name.length > 100 || subject.length > 150 || message.length > 2000)
      return json({ error: 'One or more contact fields are too long' }, 400)

    const formId = process.env.NEXT_PUBLIC_FORMSPREE_ID
    if (!formId || !/^[A-Za-z0-9]+$/.test(formId))
      return json({ error: 'Contact form is not configured' }, 503)

    const submission = new FormData()
    submission.set('name', name)
    submission.set('email', email)
    submission.set('_replyto', email)
    submission.set('subject', subject)
    submission.set('_subject', subject)
    submission.set('message', message)

    const response = await fetch(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      body: submission,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      console.error('[contact] Formspree rejected submission', { status: response.status })
      return json({ error: 'Your message could not be sent. Please try again.' }, 502)
    }
    return json({ ok: true })
  } catch (error) {
    console.error('[contact] submission failed', error)
    return json({ error: 'Your message could not be sent. Please try again.' }, 500)
  }
}
