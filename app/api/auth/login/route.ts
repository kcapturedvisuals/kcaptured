import { randomUUID } from 'crypto'
import { pool } from '@/lib/db'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createPasswordResetToken,
  createAdminSession,
  hashAdminPassword,
  normalizeAdminUsername,
  recordAdminLoginEvent,
  trustedRequestLocation,
  verifyAdminPassword,
} from '@/lib/auth-utils'
import { adminPasswordResetEmail, getAdminUrl, sendEmail } from '@/lib/email'
import { isRecord, readJsonBody } from '@/lib/input-validation'

export const runtime = 'nodejs'

const failure = () => Response.json(
  { error: 'Username or password is incorrect.' },
  { status: 401, headers: { 'Cache-Control': 'no-store' } },
)
let dummyPasswordHash: Promise<string> | undefined

function isAdminHost(request: Request) {
  const host = request.headers.get('host')?.toLowerCase().split(':')[0]
  return host === 'admin.kcapturedstudio.com' || process.env.NODE_ENV !== 'production'
}

export async function POST(request: Request) {
  if (!isAdminHost(request)) return Response.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch {
    await recordAdminLoginEvent(request, { eventType: 'login', outcome: 'invalid' })
    return failure()
  }
  if (
    !isRecord(body) ||
    typeof body.username !== 'string' ||
    typeof body.password !== 'string' ||
    body.username.length > 64 ||
    body.password.length > 256
  ) {
    await recordAdminLoginEvent(request, {
      username: isRecord(body) && typeof body.username === 'string' ? body.username : null,
      eventType: 'login',
      outcome: 'invalid',
    })
    return failure()
  }

  const username = normalizeAdminUsername(body.username)
  const { ip, country } = trustedRequestLocation(request)
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(username) || body.password.length === 0) {
    await recordAdminLoginEvent(request, { username, eventType: 'login', outcome: 'invalid' })
    return failure()
  }

  if (ip) {
    const recentAttempts = await pool.query(
      `SELECT count(*)::int AS count FROM admin_login_events
       WHERE ip_address = $1 AND event_type = 'login'
         AND created_at > now() - interval '15 minutes'`,
      [ip],
    )
    if (Number(recentAttempts.rows[0]?.count ?? 0) >= 30) {
      await recordAdminLoginEvent(request, { username, eventType: 'login', outcome: 'locked' })
      return failure()
    }
  }

  const client = await pool.connect()
  let admin: { id: string; username: string; password_hash: string; active: boolean; failed_login_attempts: number; locked_until: Date | null; role: string; must_change_password: boolean } | undefined
  let outcome: 'success' | 'failed' | 'locked' = 'failed'
  let authenticated = false
  let failedAttempts = 0
  let automaticReset: { token: string; tokenHash: string; username: string } | null = null
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT id, username, password_hash, active, failed_login_attempts, locked_until, role, must_change_password
       FROM admin_users WHERE username = $1 FOR UPDATE`,
      [username],
    )
    admin = result.rows[0]
    if (admin?.locked_until && new Date(admin.locked_until).getTime() <= Date.now()) {
      admin.locked_until = null
      await client.query(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [admin.id],
      )
    }

    if (!dummyPasswordHash) dummyPasswordHash = hashAdminPassword(randomUUID())
    const candidateHash = admin?.password_hash ?? await dummyPasswordHash
    const passwordMatches = await verifyAdminPassword(body.password, candidateHash)
    const currentlyLocked = admin?.locked_until && new Date(admin.locked_until).getTime() > Date.now()

    if (admin && admin.active && !currentlyLocked && passwordMatches) {
      authenticated = true
      outcome = 'success'
      await client.query(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
        [admin.id],
      )
    } else if (admin && admin.active && !currentlyLocked) {
      const failed = await client.query(
        `UPDATE admin_users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE WHEN failed_login_attempts + 1 >= 4 THEN now() + interval '30 minutes' ELSE locked_until END,
             updated_at = now()
         WHERE id = $1
         RETURNING failed_login_attempts`,
        [admin.id],
      )
      failedAttempts = Number(failed.rows[0]?.failed_login_attempts ?? 0)
      outcome = failedAttempts >= 4 ? 'locked' : 'failed'
    } else if (currentlyLocked) {
      outcome = 'locked'
      failedAttempts = Number(admin?.failed_login_attempts ?? 0)
    }

    if (admin && admin.active && username === 'nettey' && failedAttempts >= 3) {
      const activeReset = await client.query(
        `SELECT 1 FROM admin_password_resets
         WHERE admin_user_id = $1 AND created_at > now() - interval '30 minutes'
         LIMIT 1`,
        [admin.id],
      )
      if (!activeReset.rows[0]) {
        const reset = createPasswordResetToken()
        await client.query(
          `INSERT INTO admin_password_resets
            (token_hash, admin_user_id, expires_at)
           VALUES ($1, $2, $3)`,
          [reset.tokenHash, admin.id, reset.expiresAt],
        )
        automaticReset = { token: reset.token, tokenHash: reset.tokenHash, username: admin.username }
      }
    }

    await client.query(
      `INSERT INTO admin_login_events (id, admin_user_id, username, event_type, outcome, ip_address, country_code, user_agent)
       VALUES ($1, $2, $3, 'login', $4, $5, $6, $7)`,
      [
        randomUUID(),
        admin?.id ?? null,
        username,
        outcome,
        ip,
        country,
        request.headers.get('user-agent')?.slice(0, 1000) ?? null,
      ],
    )
    await client.query('DELETE FROM admin_login_events WHERE created_at < now() - interval \'90 days\'')
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[admin-auth][login] failed to process attempt', error)
    return Response.json(
      { error: 'Sign-in is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  } finally {
    client.release()
  }

  if (automaticReset) {
    const resetUrl = `${getAdminUrl()}/reset-password#token=${encodeURIComponent(automaticReset.token)}`
    const message = adminPasswordResetEmail(automaticReset.username, resetUrl)
    const emailResult = await sendEmail({
      to: 'nerquayex@gmail.com',
      ...message,
      idempotencyKey: `admin-password-reset-${automaticReset.tokenHash}`,
    })
    if (!emailResult.ok) {
      console.error('[admin-auth] automatic reset email delivery failed')
    }
  }

  if (!authenticated || !admin) return failure()
  const session = await createAdminSession(admin.id)
  const response = Response.json({
    success: true,
    mustChangePassword: admin.must_change_password,
  })
  response.headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${session.token}; Max-Age=${ADMIN_SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}
