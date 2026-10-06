'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'

export function AdminChangePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Those passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) {
        setError(result.error ?? 'Could not update your password.')
        return
      }
      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Could not update your password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b11] px-5 py-12 text-white">
      <section className="w-full max-w-md border border-emerald-300/30 bg-[#0c1118] p-8 shadow-[0_0_60px_rgba(16,185,129,0.1)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-300">First login // mandatory update</p>
        <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Your temporary password must be replaced before entering the dashboard. Use at least 12 characters and do not reuse your username.
        </p>
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
            {busy ? 'SAVING...' : 'SAVE NEW PASSWORD'}
          </button>
        </form>
      </section>
    </main>
  )
}
