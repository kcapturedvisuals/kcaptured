'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function CancelBookingButton({ token }: { token: string }) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  async function cancelBooking() {
    setCancelling(true)
    setError('')
    try {
      const response = await fetch(`/api/bookings/manage/${encodeURIComponent(token)}/cancel`, { method: 'POST' })
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={cancelling} className="border-red-900 bg-transparent text-red-300 hover:bg-red-950/50 hover:text-red-200">
            {cancelling ? 'Cancelling...' : 'Cancel booking'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Any deposit already paid is non-refundable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={cancelBooking}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
