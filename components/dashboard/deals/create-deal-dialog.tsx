'use client'

import { useState, useTransition } from 'react'
import { Plus, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeal } from '@/lib/actions/deals'

export function CreateDealDialog({ agents }: {
  agents: { id: string; fullName: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createDeal(formData)
      if (result.ok) {
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Deal
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[480px] animate-fade-in rounded-apple bg-paper shadow-elevated">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">New Deal</h2>
                <p className="mt-0.5 text-[13px] text-graphite">Record a new property deal.</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite hover:bg-mist hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="agentId">Agent *</Label>
                <select id="agentId" name="agentId" required className="input-base" disabled={isPending}>
                  <option value="">Select agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="propertyRef">Property Reference *</Label>
                <Input id="propertyRef" name="propertyRef" placeholder="e.g. Marina Heights Unit 204" required disabled={isPending} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Deal Amount (AED) *</Label>
                  <Input id="amount" name="amount" type="number" min="1" step="0.01" placeholder="2500000" required disabled={isPending} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="commissionRate">Commission Rate *</Label>
                  <select id="commissionRate" name="commissionRate" required className="input-base" disabled={isPending}>
                    <option value="">Select…</option>
                    <option value="0.02">2%</option>
                    <option value="0.025">2.5%</option>
                    <option value="0.03">3%</option>
                    <option value="0.035">3.5%</option>
                    <option value="0.04">4%</option>
                    <option value="0.05">5%</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4 mt-1">
                <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                <Button type="submit" variant="primary" size="md" loading={isPending}>Create Deal</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
