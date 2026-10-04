import { randomUUID } from 'crypto'
import { hashAdminPassword, hashPasswordResetToken, isSameOriginAdminRequest } from '@/lib/auth-utils'
import { pool } from '@/lib/db'
import { isRecord, readJsonBody } from '@/lib/input-validation'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOriginAdminRequest(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch {
    return Response.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
  }
  if (
    !isRecord(body) ||
    typeof body.token !== 'string' ||
    body.token.length > 128 ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    body.password.length > 256
  ) {
    return Response.json({ error: 'Use a password between 12 and 256 characters and a valid reset link.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tokenHash = hashPasswordResetToken(body.token)
    const reset = await client.query(
      `SELECT resets.admin_user_id, users.username
       FROM admin_password_resets AS resets
       JOIN admin_users AS users ON users.id = resets.admin_user_id
       WHERE resets.token_hash = $1 AND resets.used_at IS NULL
         AND resets.expires_at > now() AND users.active = true
       FOR UPDATE OF resets, users`,
      [tokenHash],
    )
    const row = reset.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return Response.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
    }
    const passwordHash = await hashAdminPassword(body.password)
    await client.query(
      `UPDATE admin_users SET password_hash = $1, must_change_password = false,
       failed_login_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE id = $2`,
      [passwordHash, row.admin_user_id],
    )
    await client.query('DELETE FROM admin_sessions WHERE admin_user_id = $1', [row.admin_user_id])
    await client.query(
      'UPDATE admin_password_resets SET used_at = now() WHERE token_hash = $1',
      [tokenHash],
    )
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, description, actor, created_at)
       VALUES ($1, 'password_reset', 'admin_auth', $2, $3, now())`,
      [randomUUID(), `Password reset completed for ${row.username}`, row.username],
    )
    await client.query('COMMIT')
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[admin-auth][password-reset] failed', error)
    return Response.json({ error: 'Could not reset password. Please request a new link.' }, { status: 500 })
  } finally {
    client.release()
  }
}
