import { adminSessionFromRequest, hashAdminPassword, isSameOriginAdminRequest } from '@/lib/auth-utils'
import { pool } from '@/lib/db'
import { isRecord, readJsonBody } from '@/lib/input-validation'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOriginAdminRequest(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const session = await adminSessionFromRequest(request)
  if (!session) return Response.json({ error: 'Sign in again to continue.' }, { status: 401 })
  if (!session.mustChangePassword) return Response.json({ error: 'Password update is not available.' }, { status: 403 })

  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch {
    return Response.json({ error: 'Invalid password details.' }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) {
    return Response.json({ error: 'Use a password between 12 and 256 characters.' }, { status: 400 })
  }
  if (body.password.toLowerCase() === session.username) {
    return Response.json({ error: 'Choose a password different from your username.' }, { status: 400 })
  }

  const passwordHash = await hashAdminPassword(body.password)
  const updated = await pool.query(
    `UPDATE admin_users
     SET password_hash = $1, must_change_password = false, failed_login_attempts = 0,
         locked_until = NULL, updated_at = now()
     WHERE id = $2 AND active = true
     RETURNING id`,
    [passwordHash, session.id],
  )
  if (!updated.rows[0]) return Response.json({ error: 'Sign in again to continue.' }, { status: 401 })
  return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
