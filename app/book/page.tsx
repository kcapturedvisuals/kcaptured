import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { BookingRequestForm } from '@/components/booking/booking-request-form'
import { ResendLinkForm } from '@/components/booking/resend-link-form'
import { pool } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Book a Session | KCAPTURED STUDIOS',
  description: 'Request a lifestyle, studio, or event photography session with KCAPTURED Studios in Jessup, Maryland and the DMV.',
}

async function getPackages() {
  try {
    const result = await pool.query(
      'SELECT name, duration, price FROM packages WHERE active = true ORDER BY sort_order ASC',
    )
    return result.rows.map((row) => ({
      name: String(row.name),
      duration: row.duration ? String(row.duration) : '',
      price: row.price == null ? null : Number(row.price),
    }))
  } catch (error) {
    console.error('[book] failed to load packages', error)
    return []
  }
}

export default async function BookPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const [{ package: requestedPackage }, packages] = await Promise.all([searchParams, getPackages()])
  const initialPackage = packages.some((item) => item.name === requestedPackage) ? requestedPackage! : ''

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-24 pt-32 md:flex-row md:gap-16">
        <section className="flex flex-col gap-6 md:w-2/5">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">Book a session</p>
          <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">Let&apos;s lock in your shoot.</h1>
          <p className="text-pretty leading-relaxed text-zinc-400">
            Tell us what you have in mind. Once you submit, we&apos;ll email you a private link where you can check
            your booking and see when your date is verified.
          </p>
          <ol className="flex flex-col gap-4 border-l border-zinc-800 pl-5 text-sm text-zinc-300">
            <li><span className="font-semibold text-white">1. Request.</span> Pick a package and your preferred date.</li>
            <li><span className="font-semibold text-white">2. Verify.</span> We review availability and confirm your date.</li>
            <li><span className="font-semibold text-white">3. Pay.</span> Your confirmation email includes payment details.</li>
          </ol>
          <p className="text-sm text-zinc-500">
            Questions about deposits or cancellations? See our{' '}
            <Link href="/faq" className="text-zinc-300 underline underline-offset-4 hover:text-white">FAQ</Link>.
          </p>
          <ResendLinkForm />
        </section>
        <section className="md:w-3/5">
          <BookingRequestForm packages={packages} initialPackage={initialPackage} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
