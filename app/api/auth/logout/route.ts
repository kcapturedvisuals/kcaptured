import {
  ADMIN_SESSION_COOKIE,
  adminSessionFromRequest,
  isSameOriginAdminRequest,
  recordAdminLoginEvent,
  revokeAdminSession,
} from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOriginAdminRequest(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const session = await adminSessionFromRequest(request)
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1)

  if (token) await revokeAdminSession(token)
  if (session) {
    await recordAdminLoginEvent(request, {
      username: session.username,
      adminUserId: session.id,
      eventType: 'logout',
      outcome: 'logout',
    })
  }
  const response = Response.json({ success: true })
  response.headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}
