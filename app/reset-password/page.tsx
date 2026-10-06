import type { Metadata } from 'next'
import { AdminResetPasswordForm } from '@/components/admin/admin-reset-password-form'

export const metadata: Metadata = {
  title: 'Reset Admin Password | KCAPTURED',
  robots: { index: false, follow: false, noarchive: true },
}

export default function AdminResetPasswordPage() {
  return <AdminResetPasswordForm />
}
