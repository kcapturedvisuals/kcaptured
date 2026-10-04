import { randomUUID } from 'crypto'
import {
  adminSessionFromRequest,
  createPasswordResetToken,
  hashAdminPassword,
  isSameOriginAdminRequest,
  normalizeAdminUsername,
} from '@/lib/auth-utils'
import { pool } from '@/lib/db'
import { adminPasswordResetEmail, getAdminUrl, sendEmail } from '@/lib/email'
import { isRecord, isValidEmail, readJsonBody } from '@/lib/input-validation'

export const runtime = 'nodejs'

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  const session = await adminSessionFromRequest(request)
  if (!session || session.role !== 'super_admin' || session.mustChangePassword) return unauthorized()
  const result = await pool.query(
    `SELECT id, username, role, active, must_change_password, failed_login_attempts, locked_until, created_at
     FROM admin_users ORDER BY created_at ASC`,
  )
  return Response.json(result.rows, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!isSameOriginAdminRequest(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const session = await adminSessionFromRequest(request)
  if (!session || session.role !== 'super_admin' || session.mustChangePassword) return unauthorized()

  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.action !== 'string') {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (body.action === 'create') {
    if (
      typeof body.username !== 'string' ||
      body.username.length > 64
    ) return Response.json({ error: 'Enter a username between 2 and 64 characters.' }, { status: 400 })
    const username = normalizeAdminUsername(body.username)
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(username)) {
      return Response.json({ error: 'Choose a valid username using letters, numbers, dots, underscores, or hyphens.' }, { status: 400 })
    }
    const passwordHash = await hashAdminPassword(username)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `INSERT INTO admin_users (id, username, password_hash, role, active, must_change_password)
         VALUES ($1, $2, $3, 'admin', true, true)
         RETURNING id, username, role, active, must_change_password, failed_login_attempts, locked_until, created_at`,
        [randomUUID(), username, passwordHash],
      )
      await client.query(
        `INSERT INTO audit_logs (id, action, entity_type, entity_id, description, actor, created_at)
         VALUES ($1, 'admin_created', 'admin_auth', $2, $3, $4, now())`,
        [randomUUID(), result.rows[0].id, `Created admin account ${username}`, session.username],
      )
      await client.query('COMMIT')
      return Response.json(result.rows[0], { status: 201, headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      await client.query('ROLLBACK')
      if ((error as { code?: string })?.code === '23505') {
        return Response.json({ error: 'That username is already in use.' }, { status: 409 })
      }
      console.error('[admin-auth][admins] account creation failed', error)
      return Response.json({ error: 'Could not create the admin account.' }, { status: 500 })
    } finally {
      client.release()
    }
  }

  if (body.action === 'reset_link') {
    if (typeof body.adminUserId !== 'string' || body.adminUserId === session.id) {
      return Response.json({ error: 'Choose another admin account.' }, { status: 400 })
    }
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (body.email != null && (typeof body.email !== 'string' || (email && !isValidEmail(email)))) {
      return Response.json({ error: 'Enter a valid email address or leave it blank to copy the link.' }, { status: 400 })
    }
    const target = await pool.query(
      `SELECT id, username FROM admin_users
       WHERE id = $1 AND active = true AND role = 'admin'`,
      [body.adminUserId],
    )
    const admin = target.rows[0]
    if (!admin) return Response.json({ error: 'Admin account not found.' }, { status: 404 })
    const reset = createPasswordResetToken()
    const resetBaseUrl = getAdminUrl()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const lockedTarget = await client.query(
        'SELECT id FROM admin_users WHERE id = $1 AND active = true AND role = \'admin\' FOR UPDATE',
        [admin.id],
      )
      if (!lockedTarget.rows[0]) {
        await client.query('ROLLBACK')
        return Response.json({ error: 'Admin account not found.' }, { status: 404 })
      }
      await client.query(
        `UPDATE admin_password_resets SET used_at = now()
         WHERE admin_user_id = $1 AND used_at IS NULL`,
        [admin.id],
      )
      await client.query(
        `INSERT INTO admin_password_resets
         (token_hash, admin_user_id, expires_at, created_by_admin_id)
         VALUES ($1, $2, $3, $4)`,
        [reset.tokenHash, admin.id, reset.expiresAt, session.id],
      )
      await client.query(
        `INSERT INTO audit_logs (id, action, entity_type, entity_id, description, actor, created_at)
         VALUES ($1, 'password_reset_link_created', 'admin_auth', $2, $3, $4, now())`,
        [randomUUID(), admin.id, `Generated one-time password reset link for ${admin.username}`, session.username],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[admin-auth][admins] reset link creation failed', error)
      return Response.json({ error: 'Could not generate a password reset link.' }, { status: 500 })
    } finally {
      client.release()
    }
    const resetUrl = `${resetBaseUrl}/reset-password#token=${encodeURIComponent(reset.token)}`
    if (email) {
      const emailResult = await sendEmail({
        to: email,
        ...adminPasswordResetEmail(admin.username, resetUrl),
        idempotencyKey: `admin-password-reset-${reset.tokenHash}`,
      })
      if (emailResult.ok) {
        return Response.json({
          username: admin.username,
          emailed: true,
          expiresAt: reset.expiresAt,
        }, { headers: { 'Cache-Control': 'no-store' } })
      }
      console.error('[admin-auth][admins] reset email delivery failed')
      return Response.json({
        error: 'Email delivery failed. You can copy and share this reset link privately instead.',
        resetUrl,
        expiresAt: reset.expiresAt,
      }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }
    return Response.json({
      username: admin.username,
      resetUrl,
      expiresAt: reset.expiresAt,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return Response.json({ error: 'Unsupported admin action.' }, { status: 400 })
}
