'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, KeyRound, UserRound } from 'lucide-react'

export function AdminLoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json() as { error?: string; mustChangePassword?: boolean }
      if (!response.ok) {
        setPassword('')
        if (response.status === 401) {
          const failedAttempts = attempts + 1
          setAttempts(failedAttempts)
          setError(
            failedAttempts === 1
              ? 'Check your username and password carefully, then try again.'
              : failedAttempts === 3
                ? 'If this is the Nettey account, check the recovery inbox for a reset link. Contact the dev if you need help.'
              : failedAttempts >= 4
                ? 'Too many failed attempts. This account is locked for 30 minutes. Contact the dev if you need help.'
                : 'Take a breath. Relax and try again in 3 minutes, or contact the dev.',
          )
        } else {
          setError(result.error ?? 'Sign-in is temporarily unavailable.')
        }
        return
      }

      if (result.mustChangePassword) {
        router.replace('/change-password')
        return
      }

      router.prefetch('/admin')
      setOpening(true)
      window.setTimeout(() => {
        router.replace('/admin')
        router.refresh()
      }, 1050)
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b11] px-5 py-12 text-[#eff8ff]">
      <div aria-hidden="true" className="admin-scanlines pointer-events-none absolute inset-0 opacity-30" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.12),_transparent_52%)]" />

      <motion.section
        animate={opening ? { opacity: 0, scale: 1.025, filter: 'blur(5px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md border border-emerald-300/30 bg-[#0c1118]/95 p-7 shadow-[0_0_60px_rgba(16,185,129,0.12)] sm:p-9"
        style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
      >
        <header className="mb-8 border-b border-emerald-300/20 pb-6">
          <div className="mb-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300/70">
            <span>KCAPTURED // CONTROL ROOM</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> SECURE</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
              <Gamepad2 aria-hidden="true" size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Administrator access</p>
              <h1 className="mt-1 text-2xl font-black tracking-wide">I'm always watching</h1>
            </div>
          </div>
          <p className="mt-5 font-mono text-xs text-zinc-500">AUTHENTICATE TO ENTER THE DASHBOARD_</p>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Username</span>
            <span className="flex h-12 items-center gap-3 border border-white/10 bg-black/40 px-3 focus-within:border-emerald-300/60">
              <UserRound aria-hidden="true" size={17} className="text-emerald-300/70" />
              <input
                autoComplete="username"
                required
                maxLength={64}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-full w-full bg-transparent font-mono text-sm outline-none placeholder:text-zinc-700"
                placeholder="ENTER USERNAME"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Password</span>
            <span className="flex h-12 items-center gap-3 border border-white/10 bg-black/40 px-3 focus-within:border-emerald-300/60">
              <KeyRound aria-hidden="true" size={17} className="text-emerald-300/70" />
              <input
                autoComplete="current-password"
                required
                maxLength={256}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full w-full bg-transparent font-mono text-sm outline-none placeholder:text-zinc-700"
                placeholder="ENTER PASSWORD"
              />
            </span>
          </label>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key={error}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="border border-amber-300/30 bg-amber-300/5 px-3 py-3 text-sm leading-relaxed text-amber-100"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={busy || opening}
            className="flex h-12 w-full items-center justify-center border border-emerald-200/60 bg-emerald-300 px-4 font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#07110e] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'CHECKING CREDENTIALS...' : opening ? 'ACCESS GRANTED' : 'START SESSION'}
          </button>
        </form>

        <footer className="mt-7 flex justify-between border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          <span>Session log enabled</span>
          <span>Build 01.01</span>
        </footer>
      </motion.section>

      <AnimatePresence>
        {opening && (
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20">
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: '-100%' }}
              transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
              className="absolute inset-x-0 top-0 h-1/2 border-b border-emerald-200/30 bg-[#05070a]"
            />
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: '100%' }}
              transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
              className="absolute inset-x-0 bottom-0 h-1/2 border-t border-emerald-200/30 bg-[#05070a]"
            />
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
