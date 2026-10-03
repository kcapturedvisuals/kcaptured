import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DashboardCancelButton } from '@/components/booking/dashboard-cancel-button'
import { pool } from '@/lib/db'
import { CLIENT_DASHBOARD_COOKIE, readDashboardToken } from '@/lib/client-dashboard-auth'
import {
  clientStatusLabel,
  canClientCancel,
  DEFAULT_PAYMENT_INSTRUCTIONS,
  formatSessionDate,
} from '@/lib/booking-status'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Bookings | KCAPTURED STUDIOS',
  robots: { index: false, follow: false },
}

const GOOGLE_REVIEW_URL = 'https://g.page/r/Cei6RNmMt0zNEBM/review'

function formatPrice(value: number | null) {
  if (value == null) return 'To be confirmed'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default async function ClientDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(CLIENT_DASHBOARD_COOKIE)?.value
  const session = token ? readDashboardToken(token) : null
  if (!session) redirect('/book?dashboard=expired')

  const [bookings, settingsResult] = await Promise.all([
    pool.query(
      `SELECT id, client_name, package_name, package_price, preferred_date, request_date, status, notes, cancelled_by
       FROM bookings WHERE lower(email) = $1 ORDER BY request_date DESC`,
      [session.email],
    ),
    pool.query('SELECT payment_instructions FROM site_settings LIMIT 1').catch((error) => {
      console.error('[client-dashboard] failed to load payment instructions', error)
      return { rows: [] as Array<{ payment_instructions: string | null }> }
    }),
  ])
  const paymentInstructions = settingsResult.rows[0]?.payment_instructions || DEFAULT_PAYMENT_INSTRUCTIONS

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-24 pt-32">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">Client dashboard</p>
          <h1 className="text-3xl font-bold md:text-4xl">Your bookings</h1>
          <p className="text-sm text-zinc-400">Signed in as {session.email}</p>
        </header>

        {bookings.rows.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8">
            <p className="text-zinc-300">There are no bookings associated with this email yet.</p>
            <Link href="/book" className="mt-4 inline-block text-white underline underline-offset-4">Request a session</Link>
          </section>
        ) : (
          <div className="flex flex-col gap-5">
            {bookings.rows.map((booking) => {
              const status = String(booking.status)
              const cancellation = canClientCancel(status, booking.preferred_date)
              return (
                <section key={booking.id} className="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{booking.package_name || 'Photography session'}</h2>
                      <p className="mt-1 text-sm text-zinc-400">Requested {formatSessionDate(booking.request_date)}</p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200">
                      {clientStatusLabel(status)}
                    </span>
                  </div>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">Preferred date</dt>
                      <dd className="mt-1">{formatSessionDate(booking.preferred_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Package amount</dt>
                      <dd className="mt-1">{formatPrice(booking.package_price == null ? null : Number(booking.package_price))}</dd>
                    </div>
                  </dl>
                  {status === 'confirmed' && (
                    <div className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-5">
                      <h3 className="font-semibold text-emerald-300">Payment details</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{paymentInstructions}</p>
                    </div>
                  )}
                  {(status === 'pending' || status === 'to_confirm') && (
                    <p className="text-sm text-zinc-400">We&apos;re reviewing your date. Payment details will be sent after it is confirmed.</p>
                  )}
                  {booking.notes && <p className="whitespace-pre-wrap text-sm text-zinc-400">{booking.notes}</p>}
                  {status !== 'cancelled' && cancellation.allowed && <DashboardCancelButton bookingId={String(booking.id)} />}
                  {status !== 'cancelled' && !cancellation.allowed && (
                    <p className="text-sm text-amber-300">{cancellation.reason}</p>
                  )}
                  {status === 'cancelled' && (
                    <p className="text-sm text-zinc-500">
                      Cancelled{booking.cancelled_by === 'client' ? ' by you' : ''}.
                    </p>
                  )}
                </section>
              )
            })}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-3xl border border-zinc-800 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="font-semibold">Enjoyed your session?</h2>
            <p className="mt-1 text-sm text-zinc-400">We&apos;d love your feedback on Google.</p>
          </div>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Leave a review
          </a>
        </section>
      </main>
      <Footer />
    </div>
  )
}
