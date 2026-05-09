'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePlan } from '@/lib/actions/cms'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

export default function PlansEditor({ plans }: { plans: Record<string, unknown>[] }) {
  const [openId, setOpenId] = useState<string | null>(plans[0]?.id as string ?? null)
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updatePlan(fd)
      setSaved(id)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  const BILLING_LABELS: Record<string, string> = { free: 'Free', monthly: 'Monthly', yearly: 'Yearly' }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {plans.map((plan) => {
        const id = plan.id as string
        const isOpen = openId === id
        const features = Array.isArray(plan.features_json) ? (plan.features_json as string[]).join('\n') : ''

        return (
          <div key={id} className="card-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              className="flex w-full items-center justify-between px-6 py-4 hover:bg-fog transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-[15px] font-semibold text-ink">{plan.label as string}</span>
                <span className="badge badge-applied">{(plan.agent_split_pct as number)}% split</span>
                {Boolean(plan.is_star) && <span className="badge badge-approved">Most popular</span>}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-graphite" /> : <ChevronDown className="h-4 w-4 text-graphite" />}
            </button>

            {isOpen && (
              <form onSubmit={(e) => handleSubmit(e, id)} className="border-t border-hairline px-6 py-5 flex flex-col gap-4">
                <input type="hidden" name="id" value={id} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Label</Label>
                    <Input name="label" defaultValue={plan.label as string} required disabled={isPending} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Agent Split %</Label>
                    <Input name="agentSplitPct" type="number" min="0" max="100" defaultValue={plan.agent_split_pct as number} required disabled={isPending} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Tagline</Label>
                  <Input name="tagline" defaultValue={plan.tagline as string ?? ''} disabled={isPending} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Billing Cycle</Label>
                    <select name="billingCycle" defaultValue={plan.billing_cycle as string} className="input-base" disabled={isPending}>
                      {['free','monthly','yearly'].map(b => <option key={b} value={b}>{BILLING_LABELS[b]}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Monthly Price (AED)</Label>
                    <Input name="priceMonthlyAed" type="number" min="0" defaultValue={plan.price_monthly_aed as number ?? ''} placeholder="0" disabled={isPending} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Yearly Price (AED)</Label>
                    <Input name="priceYearlyAed" type="number" min="0" defaultValue={plan.price_yearly_aed as number ?? ''} placeholder="0" disabled={isPending} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Features <span className="text-graphite-light">(one per line)</span></Label>
                  <textarea name="features" defaultValue={features} rows={5} disabled={isPending}
                    className="input-base resize-none py-3 text-[13px] font-mono" />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
                    <input type="checkbox" name="isStar" value="true" defaultChecked={plan.is_star as boolean} className="rounded" />
                    Most popular
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
                    <input type="checkbox" name="isActive" value="true" defaultChecked={plan.is_active as boolean} className="rounded" />
                    Active
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" variant="primary" size="sm" loading={isPending}>Save Plan</Button>
                  {saved === id && (
                    <span className="flex items-center gap-1 text-[13px] text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Saved
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
