import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'crypto'
import { isIP } from 'net'
import { pool } from '@/lib/db'
import { sanitizeText } from '@/lib/input-validation'

const ADMIN_COOKIE = 'admin_session'
const ADMIN_SESSION_SECONDS = 8 * 60 * 60
const SCRYPT_COST = 1 << 15
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1
const SCRYPT_KEY_LENGTH = 64
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024

function deriveScrypt(password: string, salt: Buffer, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
      maxmem: SCRYPT_MAX_MEMORY,
    }, (error, derived) => {
      if (error) reject(error)
      else resolve(derived)
    })
  })
}

export interface AdminSession {
  id: string
  username: string
  role: 'admin' | 'super_admin'
  mustChangePassword: boolean
}

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase()
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  }
}

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await deriveScrypt(password, salt, SCRYPT_KEY_LENGTH)
  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyAdminPassword(password: string, encoded: string) {
  const [algorithm, costText, blockText, parallelText, saltText, hashText, extra] = encoded.split('$')
  if (
    algorithm !== 'scrypt' ||
    !costText || !blockText || !parallelText || !saltText || !hashText || extra ||
    !/^\d+$/.test(costText) || !/^\d+$/.test(blockText) || !/^\d+$/.test(parallelText)
  ) return false
  if (
    Number(costText) !== SCRYPT_COST ||
    Number(blockText) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelText) !== SCRYPT_PARALLELIZATION
  ) return false

  const expected = Buffer.from(hashText, 'base64url')
  const salt = Buffer.from(saltText, 'base64url')
  if (expected.length !== SCRYPT_KEY_LENGTH || salt.length !== 16) return false
  const actual = await deriveScrypt(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000)
  await pool.query('DELETE FROM admin_sessions WHERE expires_at <= now()')
  await pool.query(
    'INSERT INTO admin_sessions (session_hash, admin_user_id, expires_at) VALUES ($1, $2, $3)',
    [hashSessionToken(token), adminUserId, expiresAt],
  )
  return { token, expiresAt, maxAge: ADMIN_SESSION_SECONDS }
}

export async function revokeAdminSession(token: string) {
  await pool.query('DELETE FROM admin_sessions WHERE session_hash = $1', [hashSessionToken(token)])
}

export async function getAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token || token.length > 128) return null
  const result = await pool.query(
    `SELECT users.id, users.username, users.role, users.must_change_password
     FROM admin_sessions AS sessions
     JOIN admin_users AS users ON users.id = sessions.admin_user_id
     WHERE sessions.session_hash = $1
       AND sessions.expires_at > now()
       AND users.active = true`,
    [hashSessionToken(token)],
  )
  const row = result.rows[0]
  if (!row || !['admin', 'super_admin'].includes(row.role)) return null
  return {
    id: String(row.id),
    username: String(row.username),
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
  }
}

function cookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

export async function adminSessionFromRequest(request: Request) {
  return getAdminSession(cookieValue(request.headers.get('cookie'), ADMIN_COOKIE))
}

export async function verifyUploadRequest(request: Request) {
  if (request.headers.get('x-upload-source') !== 'kc-upload') return false
  const session = await adminSessionFromRequest(request)
  return Boolean(session && !session.mustChangePassword)
}

export function trustedRequestLocation(request: Request) {
  const countryHeader = request.headers.get('x-vercel-ip-country')
  const country = countryHeader && /^[A-Za-z]{2}$/.test(countryHeader)
    ? countryHeader.toUpperCase()
    : null
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const trustedIp = process.env.VERCEL
    ? request.headers.get('x-real-ip') ?? forwardedIp
    : request.headers.get('x-real-ip') ?? forwardedIp
  const ip = trustedIp && trustedIp.length <= 64 && isIP(trustedIp)
    ? trustedIp === '::1' ? '127.0.0.1' : trustedIp
    : null
  return { ip, country }
}

export async function recordAdminLoginEvent(
  request: Request,
  event: {
    username?: string | null
    adminUserId?: string | null
    eventType: 'page_view' | 'login' | 'logout'
    outcome: 'viewed' | 'success' | 'failed' | 'locked' | 'invalid' | 'logout'
  },
) {
  const { ip, country } = trustedRequestLocation(request)
  const agent = sanitizeText(request.headers.get('user-agent')).slice(0, 1000) || null
  const username = event.username ? sanitizeText(normalizeAdminUsername(event.username)).slice(0, 64) : null
  await pool.query(
    `INSERT INTO admin_login_events
      (id, admin_user_id, username, event_type, outcome, ip_address, country_code, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), event.adminUserId ?? null, username, event.eventType, event.outcome, ip, country, agent],
  )
  await pool.query(
    "DELETE FROM admin_login_events WHERE created_at < now() - interval '90 days'",
  )
}

export const ADMIN_SESSION_COOKIE = ADMIN_COOKIE
export const ADMIN_SESSION_MAX_AGE = ADMIN_SESSION_SECONDS

export function isSameOriginAdminRequest(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    const originUrl = new URL(origin)
    return process.env.NODE_ENV === 'production'
      ? originUrl.origin === 'https://admin.kcapturedstudio.com'
      : originUrl.host === host
  } catch {
    return false
  }
}
