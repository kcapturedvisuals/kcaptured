'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

interface PackageOption {
  name: string
  duration: string
  price: number | null
}

const fieldClass = 'h-11 border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600'

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function BookingRequestForm({ packages, initialPackage }: { packages: PackageOption[]; initialPackage: string }) {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const data = new FormData(form)
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: data.get('clientName'),
          email: data.get('email'),
          phone: data.get('phone'),
          packageName: data.get('packageName'),
          preferredDate: data.get('preferredDate') || null,
          notes: data.get('notes'),
          idempotencyKey,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.')
      setSubmittedEmail(String(data.get('email') ?? ''))
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedEmail) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <CheckCircle2 className="size-10 text-emerald-400" aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Request received</h2>
        <p className="leading-relaxed text-zinc-400">
          We sent a link to <span className="font-medium text-white">{submittedEmail}</span> where you can view your
          booking, track verification, and cancel if needed. Check your spam folder if it doesn&apos;t arrive in a few
          minutes.
        </p>
        <Button
          variant="outline"
          className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
          onClick={() => {
            setSubmittedEmail('')
            setIdempotencyKey(crypto.randomUUID())
          }}
        >
          Book another session
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clientName">Full name</Label>
        <Input id="clientName" name="clientName" required maxLength={120} autoComplete="name" className={fieldClass} />
      </div>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={fieldClass} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="phone">
            Phone <span className="text-zinc-500">(optional)</span>
          </Label>
          <Input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className={fieldClass} />
        </div>
      </div>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="packageName">Package</Label>
          <select
            id="packageName"
            name="packageName"
            defaultValue={initialPackage}
            className="h-11 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            <option value="">Not sure yet</option>
            {packages.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
                {item.price != null ? ` - $${item.price}` : ''}
                {item.duration ? ` (${item.duration})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="preferredDate">Preferred date</Label>
          <Input
            id="preferredDate"
            name="preferredDate"
            type="date"
            required
            min={todayIso()}
            className={`${fieldClass} [color-scheme:dark]`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">
          Notes <span className="text-zinc-500">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="Location ideas, number of people, preferred time of day..."
          className="border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="h-12 text-base font-semibold">
        {submitting ? <Spinner className="size-4" /> : null}
        {submitting ? 'Sending request...' : 'Request booking'}
      </Button>
    </form>
  )
}
