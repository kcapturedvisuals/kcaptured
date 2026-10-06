'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizePhone, sanitizeText } from '@/lib/input-validation'

interface PackageOption {
  id: string
  name: string
}

interface BookingFormProps {
  isOpen: boolean
  initialPackage?: string
  onClose: () => void
  onSaved?: () => void
}

const INSTAGRAM_DM_HANDLE = 'kcapturedvisuals'

export function BookingForm({ isOpen, initialPackage = '', onClose, onSaved }: BookingFormProps) {
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [packageName, setPackageName] = useState(initialPackage)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [savedSummary, setSavedSummary] = useState({ packageName: '', preferredDate: '' })
  const submittingRef = useRef(false)
  const requestKeyRef = useRef(crypto.randomUUID())

  const formatDateLabel = (value: string) => {
    if (!value) return 'a preferred date'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const buildInstagramMessage = (selectedPackage: string, preferredDate: string) => {
    const packageLabel = selectedPackage.trim() || 'a photography package'
    const dateLabel = formatDateLabel(preferredDate)
    return `Hi KCAPTURED, I'd like to book the ${packageLabel} package for ${dateLabel}. Please confirm availability.`
  }

  const buildInstagramDmUrl = (selectedPackage: string, preferredDate: string) => {
    const message = buildInstagramMessage(selectedPackage, preferredDate)
    const encodedMessage = encodeURIComponent(message)
    return {
      dmUrl: `https://ig.me/m/${INSTAGRAM_DM_HANDLE}?text=${encodedMessage}`,
      directAppUrl: `instagram://direct/inbox`,
      profileUrl: `https://www.instagram.com/${INSTAGRAM_DM_HANDLE}/`,
      message,
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setPackageName(initialPackage)
    setSaved(false)
    setSavedMessage('')
    setSavedSummary({ packageName: '', preferredDate: '' })
    setError('')
    requestKeyRef.current = crypto.randomUUID()
    fetch('/api/packages')
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setPackages(Array.isArray(rows) ? rows : []))
      .catch(() => setPackages([]))
  }, [initialPackage, isOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const preferredDate = String(form.get('preferredDate') ?? '').trim()
    const body = {
      clientName: sanitizeText(form.get('clientName')),
      email: sanitizeText(form.get('email')).toLowerCase(),
      phone: sanitizePhone(form.get('phone')) ?? '',
      packageName: sanitizeText(packageName),
      preferredDate,
      notes: sanitizeText(form.get('notes')),
      idempotencyKey: requestKeyRef.current,
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const contentType = response.headers.get('content-type') ?? ''
      const responseText = await response.text()
      let result: { booking?: { id?: string }; alreadyCreated?: boolean; error?: string } = {}

      if (responseText.trim() && contentType.toLowerCase().includes('application/json')) {
        try {
          result = JSON.parse(responseText)
        } catch {
          console.error('[booking-form] failed to parse JSON response', {
            status: response.status,
            contentType,
          })
        }
      } else if (responseText.trim()) {
        console.error('[booking-form] received non-JSON booking response', {
          status: response.status,
          contentType,
        })
      }

      if (!response.ok) {
        setError(result.error || 'Your request could not be submitted. Please check your details and try again.')
        return
      }

      if (!result.booking?.id) {
        console.error('[booking-form] successful HTTP response did not include booking.id', {
          status: response.status,
          contentType,
        })
        formElement.reset()
        setSavedMessage('Your request reached the server, but the confirmation response was incomplete. Please do not submit it again. We will review your request shortly.')
        setSaved(true)
        return
      }

      const summaryPackage = packageName.trim() || 'your selected package'
      const summaryDate = preferredDate || 'a preferred date'
      setSavedSummary({ packageName: summaryPackage, preferredDate: summaryDate })
      formElement.reset()
      setSavedMessage(
        result.alreadyCreated
          ? 'Your booking request was already saved. We will review it and get back to you.'
          : 'Your booking request was created. We will contact you shortly.'
      )
      setSaved(true)
    } catch {
      console.error('[booking-form] booking request failed')
      setError('Your request could not be submitted. Please try again.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleContinueOnSite = () => {
    onSaved?.()
    onClose()
  }

  const handleContinueInstagram = async () => {
    const { dmUrl, directAppUrl, profileUrl, message } = buildInstagramDmUrl(savedSummary.packageName, savedSummary.preferredDate)

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
      }
    } catch (error) {
      console.warn('[booking-form] clipboard copy failed', error)
    }

    try {
      const appWindow = window.open(directAppUrl, '_blank', 'noopener,noreferrer')
      if (!appWindow) {
        window.open(dmUrl, '_blank', 'noopener,noreferrer')
      } else {
        setTimeout(() => {
          const fallbackWindow = window.open(dmUrl, '_blank', 'noopener,noreferrer')
          if (!fallbackWindow) {
            window.open(profileUrl, '_blank', 'noopener,noreferrer')
          }
        }, 900)
      }
    } catch (error) {
      console.warn('[booking-form] Instagram DM open failed, using fallback', error)
      window.open(dmUrl, '_blank', 'noopener,noreferrer')
    }

    onSaved?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-black/95 p-6 text-white shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-gray-400 transition-colors hover:text-white" aria-label="Close booking form">
          <X size={22} />
        </button>
        <h2 className="mb-2 text-2xl font-bold">Request a booking</h2>
        <p className="mb-6 text-gray-300">Send your details and we will confirm availability.</p>
        {saved ? (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-emerald-200">
              <p className="font-medium">{savedMessage || 'Your booking request was created. We will contact you shortly.'}</p>
              <p className="mt-2 text-sm text-emerald-100/90">
                Booking: {savedSummary.packageName || 'Your selected package'} · {formatDateLabel(savedSummary.preferredDate)}
              </p>
              <p className="mt-3 text-xs text-emerald-50/90">
                Instagram will open with your message copied so you can send it quickly.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={handleContinueOnSite} className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10">
                Continue on site
              </Button>
              <Button type="button" onClick={handleContinueInstagram} className="w-full">Continue to Instagram DM</Button>
            </div>
          </div>
        ) : <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div>
            <label htmlFor="booking-client" className="mb-1 block text-sm font-medium">Name</label>
            <input id="booking-client" name="clientName" type="text" autoComplete="name" required maxLength={120} className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="booking-email" className="mb-1 block text-sm font-medium">Email</label>
              <input id="booking-email" name="email" type="email" autoComplete="email" required maxLength={254} className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40" />
            </div>
            <div>
              <label htmlFor="booking-phone" className="mb-1 block text-sm font-medium">Phone</label>
              <input id="booking-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40" />
            </div>
          </div>
          <div>
            <label htmlFor="booking-package" className="mb-1 block text-sm font-medium">Package</label>
            <select id="booking-package" value={packageName} onChange={(event) => setPackageName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40">
              <option value="" className="bg-black">Select a package</option>
              {packages.map((pkg) => <option key={pkg.id} value={pkg.name} className="bg-black">{pkg.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="booking-date" className="mb-1 block text-sm font-medium">Preferred date</label>
            <input id="booking-date" name="preferredDate" type="date" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40" />
          </div>
          <div>
            <label htmlFor="booking-notes" className="mb-1 block text-sm font-medium">Message</label>
            <textarea id="booking-notes" name="notes" rows={4} maxLength={2000} className="w-full resize-none rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/40" />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Submitting...' : 'Submit booking request'}</Button>
        </form>}
      </div>
    </div>
  )
}
