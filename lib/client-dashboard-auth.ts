import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

export const CLIENT_DASHBOARD_COOKIE = 'client_dashboard_session'
export const CLIENT_DASHBOARD_TTL_SECONDS = 24 * 60 * 60

interface DashboardSession {
  email: string
  expiresAt: number
}

function encryptionKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required for client dashboard links')
  return createHash('sha256').update(secret).digest()
}

export function createDashboardToken(email: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + CLIENT_DASHBOARD_TTL_SECONDS
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ email: email.trim().toLowerCase(), expiresAt })),
    cipher.final(),
  ])
  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function readDashboardToken(token: string, now = Date.now()): DashboardSession | null {
  if (!token || token.length > 1000) return null
  const [ivPart, tagPart, encryptedPart, extra] = token.split('.')
  if (!ivPart || !tagPart || !encryptedPart || extra) return null

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivPart, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ])
    const session = JSON.parse(decrypted.toString('utf8')) as DashboardSession
    if (
      !session.email ||
      !/^\S+@\S+\.\S+$/.test(session.email) ||
      !Number.isInteger(session.expiresAt) ||
      session.expiresAt <= Math.floor(now / 1000)
    ) {
      return null
    }
    return session
  } catch {
    return null
  }
}

export function dashboardEmailFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${CLIENT_DASHBOARD_COOKIE}=`))
  if (!sessionCookie) return null
  return readDashboardToken(sessionCookie.slice(CLIENT_DASHBOARD_COOKIE.length + 1))?.email ?? null
}
