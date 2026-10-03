import { NextResponse } from 'next/server'
import {
  CLIENT_DASHBOARD_COOKIE,
  readDashboardToken,
} from '@/lib/client-dashboard-auth'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const session = readDashboardToken(token)
  const destination = new URL(session ? '/dashboard' : '/book?dashboard=expired', request.url)
  const response = NextResponse.redirect(destination)
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  if (session) {
    response.cookies.set(CLIENT_DASHBOARD_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expiresAt * 1000),
    })
  }

  return response
}
