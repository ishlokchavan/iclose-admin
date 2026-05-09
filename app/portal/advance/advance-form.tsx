'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestAdvance } from '@/lib/actions/portal'
import type { Deal } from '@/db/schema'

export default function AdvanceRequestForm({
  signedDeals,
}: {
  signedDeals: Deal[]
}) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  if (signedDeals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-graphite-light" />
        <div>
          <p className="text-[14px] font-medium text-ink">No eligible deals</p>
          <p className="mt-1 text-[13px] text-graphite">
            You need at least one signed deal to request an advance.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <div>
          <p className="text-[15px] font-medium text-ink">Request submitted</p>
          <p className="mt-1 text-[13px] text-graphite">
            Your advance request has been sent for review.
          </p>
        </div>
        <button
          onClick={() => { setSuccess(false); setError(null); setSelectedDeal(null) }}
          className="applelink text-[13px]"
        >
          Submit another
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await requestAdvance(formData)
      if (result.ok) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dealId">Select Deal</Label>
        <select
          id="dealId"
          name="dealId"
          required
          onChange={(e) => {
            const deal = signedDeals.find((d) => d.id === e.target.value) ?? null
            setSelectedDeal(deal)
          }}
          className="input-base"
        >
          <option value="">Choose a signed deal…</option>
          {signedDeals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.propertyRef} — {formatAed(deal.commissionAmount)} commission
            </option>
          ))}
        </select>
      </div>

      {selectedDeal && (
        <div className="rounded-xl bg-mist px-4 py-3 text-[13px] text-graphite">
          Max advance: <span className="font-semibold text-ink">{formatAed(selectedDeal.commissionAmount)}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amountRequested">Amount (AED)</Label>
        <Input
          id="amountRequested"
          name="amountRequested"
          type="number"
          min="1"
          max={selectedDeal ? selectedDeal.commissionAmount : undefined}
          step="0.01"
          placeholder="Enter amount"
          required
          disabled={isPending || !selectedDeal}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
        {isPending ? 'Submitting…' : 'Submit Request'}
      </Button>
    </form>
  )
}
