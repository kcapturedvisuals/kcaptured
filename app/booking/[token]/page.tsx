import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CancelBookingButton } from '@/components/booking/cancel-booking-button'
import { pool } from '@/lib/db'
import {
  CANCELLATION_POLICY,
  DEFAULT_PAYMENT_INSTRUCTIONS,
  canClientCancel,
  clientStatusLabel,
  formatSessionDate,
} from '@/lib/booking-status'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Booking | KCAPTURED STUDIOS',
  robots: { index: false, follow: false },
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
  cancelled: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  pending: 'border-amber-800 bg-amber-950/40 text-amber-300',
}

async function getBooking(token: string) {
  if (!token || token.length > 100) return null
  const [booking, settings] = await Promise.all([
    pool.query(
      'SELECT client_name, package_name, preferred_date, request_date, status, notes, cancelled_by FROM bookings WHERE manage_token = $1 LIMIT 1',
      [token],
    ),
    pool.query('SELECT payment_instructions, booking_email, email FROM site_settings LIMIT 1').catch(() => ({ rows: [] as any[] })),
  ])
  if (!booking.rows[0]) return null
  return { booking: booking.rows[0], settings: settings.rows[0] ?? {} }
}

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getBooking(token)
  if (!data) notFound()
  const { booking, settings } = data
  const status = String(booking.status)
  const cancel = canClientCancel(status, booking.preferred_date)
  const contactEmail = settings.booking_email || settings.email

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-24 pt-32">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">Your booking</p>
          <h1 className="text-balance text-3xl font-bold md:text-4xl">Hi {booking.client_name}</h1>
        </div>

        <section aria-labelledby="booking-details" className="flex flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="booking-details" className="text-lg font-semibold">Session details</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
              {clientStatusLabel(status)}
            </span>
          </div>
          <dl className="flex flex-col divide-y divide-zinc-800 text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-zinc-500">Package</dt>
              <dd className="text-right">{booking.package_name || 'To be discussed'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-zinc-500">Preferred date</dt>
              <dd className="text-right">{formatSessionDate(booking.preferred_date)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-zinc-500">Requested on</dt>
              <dd className="text-right">{formatSessionDate(booking.request_date)}</dd>
            </div>
            {booking.notes && (
              <div className="flex flex-col gap-1 py-3">
                <dt className="text-zinc-500">Your notes</dt>
                <dd className="whitespace-pre-wrap text-zinc-300">{booking.notes}</dd>
              </div>
            )}
          </dl>

          {status === 'confirmed' && (
            <div className="flex flex-col gap-2 rounded-2xl border border-emerald-900 bg-emerald-950/20 p-5">
              <h3 className="font-semibold text-emerald-300">Payment</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {settings.payment_instructions || DEFAULT_PAYMENT_INSTRUCTIONS}
              </p>
            </div>
          )}
          {(status === 'pending' || status === 'to_confirm') && (
            <p className="text-sm leading-relaxed text-zinc-400">
              We&apos;re reviewing your date. You&apos;ll get an email with payment details as soon as it&apos;s verified.
            </p>
          )}
          {status === 'cancelled' && (
            <p className="text-sm text-zinc-400">
              This booking was cancelled{booking.cancelled_by === 'client' ? ' by you' : ''}.{' '}
              <Link href="/book" className="text-white underline underline-offset-4">Book a new session</Link>
            </p>
          )}
        </section>

        {status !== 'cancelled' && (
          <section aria-labelledby="cancel-heading" className="flex flex-col gap-3 rounded-3xl border border-zinc-800 p-6 md:p-8">
            <h2 id="cancel-heading" className="text-lg font-semibold">Need to cancel?</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{CANCELLATION_POLICY}</p>
            {cancel.allowed ? (
              <CancelBookingButton token={token} />
            ) : (
              <p className="text-sm text-amber-300">
                {cancel.reason}
                {contactEmail ? (
                  <>
                    {' '}
                    <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">{contactEmail}</a>
                  </>
                ) : null}
              </p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
