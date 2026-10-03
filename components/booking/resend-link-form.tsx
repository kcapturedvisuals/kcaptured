'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sanitizeText } from '@/lib/input-validation'

export function ResendLinkForm() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const email = sanitizeText(new FormData(event.currentTarget).get('email')).toLowerCase()
    setSending(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/bookings/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.')
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 p-5">
      <Label htmlFor="lookup-email" className="text-sm font-semibold text-white">
        Already booked? Get your dashboard link
      </Label>
      <div className="flex gap-2">
        <Input
          id="lookup-email"
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-10 border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600"
        />
        <Button type="submit" variant="secondary" disabled={sending} className="h-10">
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
      {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
