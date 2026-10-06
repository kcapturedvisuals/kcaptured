import { NextRequest, NextResponse } from 'next/server'

const ADMIN_HOST = 'admin.kcapturedstudio.com'
const PUBLIC_HOST = 'kcapturedstudio.com'
const PUBLIC_HOSTS = new Set([PUBLIC_HOST, `www.${PUBLIC_HOST}`])

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host')?.toLowerCase().split(':')[0] ?? ''
  const { pathname, search } = request.nextUrl

  if (hostname === ADMIN_HOST) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (
      (pathname === '/admin' || pathname.startsWith('/admin/')) &&
      !request.cookies.get('admin_session')?.value
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!['/login', '/change-password', '/reset-password'].includes(pathname) &&
        !pathname.startsWith('/admin') &&
        !pathname.startsWith('/api/') &&
        !pathname.startsWith('/_next/') &&
        !/\.[a-z0-9]+$/i.test(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${PUBLIC_HOST}`))
    }
    const response = NextResponse.next()
    if (pathname === '/reset-password') {
      response.headers.set('Referrer-Policy', 'no-referrer')
      response.headers.set('Cache-Control', 'no-store')
    }
    return response
  }

  if (PUBLIC_HOSTS.has(hostname) && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${ADMIN_HOST}`))
  }
  if (PUBLIC_HOSTS.has(hostname) && ['/login', '/change-password', '/reset-password'].includes(pathname)) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${ADMIN_HOST}`))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
