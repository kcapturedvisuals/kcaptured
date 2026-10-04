import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { recordAdminLoginEvent } from '@/lib/auth-utils'
import { AdminLoginForm } from '@/components/admin/admin-login-form'

export const metadata: Metadata = {
  title: 'Admin Access | KCAPTURED',
  robots: { index: false, follow: false, noarchive: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const requestHeaders = await headers()
  await recordAdminLoginEvent(
    new Request('https://admin.kcapturedstudio.com/login', { headers: requestHeaders }),
    { eventType: 'page_view', outcome: 'viewed' },
  )

  return <AdminLoginForm />
}
