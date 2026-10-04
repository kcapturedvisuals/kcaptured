import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminChangePasswordForm } from '@/components/admin/admin-change-password-form'
import { ADMIN_SESSION_COOKIE, getAdminSession } from '@/lib/auth-utils'

export const metadata: Metadata = {
  title: 'Set Your Password | KCAPTURED',
  robots: { index: false, follow: false, noarchive: true },
}

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  const session = await getAdminSession(token)
  if (!session) redirect('/login')
  if (!session.mustChangePassword) redirect('/admin')
  return <AdminChangePasswordForm />
}
