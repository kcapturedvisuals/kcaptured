import Link from 'next/link'
import { Camera, ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="relative flex min-h-[75vh] items-center justify-center overflow-hidden px-6 pb-20 pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        </div>

        <section className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-rose-300">
            <Camera aria-hidden="true" size={26} strokeWidth={1.5} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Out of frame</p>
          <h1 className="mt-4 text-7xl font-bold tracking-tight text-white sm:text-8xl">404</h1>
          <p className="mt-4 text-balance text-2xl font-semibold sm:text-3xl">
            Looks like this moment got away.
          </p>
          <p className="mt-4 max-w-lg text-pretty leading-relaxed text-zinc-400">
            We can&apos;t find the page you&apos;re looking for. The link may be old, or the page may have moved.
            If you came here from a booking email, you can request a fresh dashboard link.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Back to home
            </Link>
            <Link
              href="/book"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.06]"
            >
              Get a dashboard link
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
