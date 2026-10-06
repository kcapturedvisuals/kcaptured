'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'

export function AdminResetPasswordForm() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const resetToken = fragment.get('token') ?? ''
    setToken(resetToken)
    if (resetToken) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Those passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) {
        setError(result.error ?? 'This reset link is invalid or expired.')
        return
      }
      setComplete(true)
    } catch {
      setError('Could not reset the password. Please request a new link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b11] px-5 py-12 text-white">
      <section className="w-full max-w-md border border-emerald-300/30 bg-[#0c1118] p-8 shadow-[0_0_60px_rgba(16,185,129,0.1)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-300">Secure recovery // one-time link</p>
        <h1 className="mt-4 text-2xl font-bold">Reset admin password</h1>
        {complete ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-emerald-200">Password updated. All existing admin sessions have been signed out.</p>
            <Link href="/login" className="inline-flex h-11 items-center border border-emerald-200/60 bg-emerald-300 px-5 font-mono text-sm font-bold uppercase tracking-wider text-[#07110e] hover:bg-emerald-200">
              Return to sign in
            </Link>
          </div>
        ) : !token ? (
          <p className="mt-5 text-sm text-rose-200">This reset link is invalid or expired. Ask the super admin for a new link.</p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">New password</span>
              <span className="flex h-12 items-center gap-3 border border-white/10 bg-black/40 px-3 focus-within:border-emerald-300/60">
                <KeyRound aria-hidden="true" size={17} className="text-emerald-300/70" />
                <input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-full w-full bg-transparent font-mono text-sm outline-none" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Confirm new password</span>
              <input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 w-full border border-white/10 bg-black/40 px-3 font-mono text-sm outline-none focus:border-emerald-300/60" />
            </label>
            {error && <p role="alert" className="border border-rose-300/30 bg-rose-300/5 p-3 text-sm text-rose-100">{error}</p>}
            <button type="submit" disabled={busy} className="h-12 w-full border border-emerald-200/60 bg-emerald-300 font-mono text-sm font-bold uppercase tracking-widest text-[#07110e] hover:bg-emerald-200 disabled:opacity-60">
              {busy ? 'UPDATING...' : 'SET NEW PASSWORD'}
            </button>
            <p className="text-xs text-zinc-500">Use at least 12 characters. This link expires after 30 minutes and can only be used once.</p>
          </form>
        )}
      </section>
    </main>
  )
}
