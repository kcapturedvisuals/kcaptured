'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DashboardCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  async function cancelBooking() {
    if (!window.confirm('Cancel this booking? Any deposit already paid is non-refundable.')) return
    setCancelling(true)
    setError('')
    try {
      const response = await fetch(`/api/client-dashboard/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not cancel this booking.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this booking.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={cancelBooking}
        disabled={cancelling}
        className="border-red-900 bg-transparent text-red-300 hover:bg-red-950/50 hover:text-red-200"
      >
        {cancelling ? 'Cancelling...' : 'Cancel booking'}
      </Button>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
