export type BookingStatusValue = 'pending' | 'to_confirm' | 'confirmed' | 'cancelled'

export const CANCELLATION_CUTOFF_HOURS = 24
export const MANAGE_LINK_TTL_HOURS = 6

export const DEFAULT_PAYMENT_INSTRUCTIONS =
  'A $20 deposit is required to hold your date, with the remaining balance due on the day of your session. We accept cash, Cash App ($Kenstevens2), and Zelle (kenny.stevens13@hotmail.com). Please include your name and session date with your payment.'

export const CANCELLATION_POLICY =
  'Deposits are non-refundable. Cancellations within 24 hours of the shoot are non-refundable and count as payment for missed time.'

export function isBookingStatus(value: unknown): value is BookingStatusValue {
  return value === 'pending' || value === 'to_confirm' || value === 'confirmed' || value === 'cancelled'
}

export function clientStatusLabel(status: string) {
  if (status === 'confirmed') return 'Verified'
  if (status === 'cancelled') return 'Cancelled'
  return 'Awaiting verification'
}

export function canClientCancel(status: string, preferredDate: Date | string | null, now = new Date()) {
  if (status === 'cancelled') return { allowed: false, reason: 'This booking is already cancelled.' }
  if (!preferredDate) return { allowed: true, reason: '' }
  const sessionTime = new Date(preferredDate).getTime()
  if (Number.isNaN(sessionTime)) return { allowed: true, reason: '' }
  const hoursUntil = (sessionTime - now.getTime()) / (60 * 60 * 1000)
  if (hoursUntil < CANCELLATION_CUTOFF_HOURS)
    return {
      allowed: false,
      reason: `Online cancellation closes ${CANCELLATION_CUTOFF_HOURS} hours before your session. Please contact us directly.`,
    }
  return { allowed: true, reason: '' }
}

export function formatSessionDate(value: Date | string | null) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
