import { adminSessionFromRequest } from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await adminSessionFromRequest(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({
    id: session.id,
    username: session.username,
    role: session.role,
    mustChangePassword: session.mustChangePassword,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
