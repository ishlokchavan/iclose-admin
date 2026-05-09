'use client'

import { useState, useTransition } from 'react'
import { Plus, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAgentByAdmin } from '@/lib/actions/agents'

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createAgentByAdmin(formData)
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
        <Plus className="h-4 w-4" /> New Agent
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-[480px] animate-fade-in rounded-apple bg-paper shadow-elevated">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">New Agent</h2>
                <p className="mt-0.5 text-[13px] text-graphite">Create an agent record manually.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite transition-colors hover:bg-mist hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" placeholder="Ahmed Al Mansouri" required disabled={isPending} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" placeholder="agent@example.com" required disabled={isPending} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" name="phone" placeholder="+971501234567" required disabled={isPending} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="isLicensedAgent">Agent Type</Label>
                  <select id="isLicensedAgent" name="isLicensedAgent" className="input-base" disabled={isPending}>
                    <option value="true">Licensed Agent</option>
                    <option value="false">Connector / Referrer</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dealVolume">Deal Volume</Label>
                  <select id="dealVolume" name="dealVolume" className="input-base" disabled={isPending}>
                    <option value="">Select…</option>
                    <option value="0-1">0–1 / month</option>
                    <option value="1-3">1–3 / month</option>
                    <option value="3-5">3–5 / month</option>
                    <option value="5-10">5–10 / month</option>
                    <option value="10+">10+ / month</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="initialStatus">Initial Status</Label>
                <select id="initialStatus" name="initialStatus" className="input-base" disabled={isPending}>
                  <option value="applied">Applied</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan">Plan</Label>
                <select id="plan" name="plan" className="input-base" disabled={isPending}>
                  <option value="plus">Plus — Free (60% split)</option>
                  <option value="pro">Pro — AED 1,500/mo (80% split)</option>
                  <option value="pro_max">Pro Max — AED 40,000/yr (90% split)</option>
                  <option value="ultra">Ultra — AED 100,000/yr (100% split)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" placeholder="referral, walk-in, linkedin…" disabled={isPending} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4 mt-1">
                <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={isPending}>
                  Create Agent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
