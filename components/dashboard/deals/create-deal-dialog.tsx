'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, AlertCircle, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeal } from '@/lib/actions/deals'

type Agent = { id: string; fullName: string }

function formatAed(val: number) {
  if (!val || isNaN(val)) return ''
  return val.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CreateDealDialog({ agents }: { agents: Agent[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Agent search
  const [agentSearch, setAgentSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const filteredAgents = agents.filter((a) =>
    a.fullName.toLowerCase().includes(agentSearch.toLowerCase())
  )

  // Financials
  const [amount, setAmount] = useState('')
  const [commissionMode, setCommissionMode] = useState<'pct' | 'aed'>('pct')
  const [commissionPct, setCommissionPct] = useState('')
  const [commissionAed, setCommissionAed] = useState('')
  const [vatIncluded, setVatIncluded] = useState<'excluded' | 'included'>('excluded')

  const VAT_RATE = 0.05
  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0
  const commissionPctNum = parseFloat(commissionPct) / 100 || 0
  const commissionAedNum = parseFloat(commissionAed.replace(/,/g, '')) || 0

  // Auto-calculate the other field
  const grossCommission = commissionMode === 'pct'
    ? amountNum * commissionPctNum
    : commissionAedNum

  const derivedPct = commissionMode === 'aed' && amountNum > 0
    ? (commissionAedNum / amountNum) * 100
    : commissionPctNum * 100

  const vat = grossCommission * VAT_RATE
  const netCommission = vatIncluded === 'included'
    ? grossCommission / (1 + VAT_RATE)
    : grossCommission
  const totalWithVat = vatIncluded === 'included'
    ? grossCommission
    : grossCommission + vat

  function reset() {
    setAgentSearch('')
    setSelectedAgent(null)
    setAmount('')
    setCommissionPct('')
    setCommissionAed('')
    setVatIncluded('excluded')
    setCommissionMode('pct')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!selectedAgent) { setError('Please select an agent'); return }
    const formData = new FormData(e.currentTarget)
    formData.set('agentId', selectedAgent.id)
    // Always store commission as a rate (0.xx)
    formData.set('commissionRate', String(derivedPct / 100))
    startTransition(async () => {
      const result = await createDeal(formData)
      if (result.ok) { reset(); setOpen(false) }
      else setError(result.error)
    })
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Deal
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => { reset(); setOpen(false) }} />

          <div className="relative w-full max-w-[560px] animate-fade-in rounded-apple bg-paper shadow-elevated overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">New Deal</h2>
                <p className="mt-0.5 text-[13px] text-graphite">Record a new property transaction.</p>
              </div>
              <button onClick={() => { reset(); setOpen(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite hover:bg-mist hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
                  </div>
                )}

                {/* Agent — searchable */}
                <div className="flex flex-col gap-1.5">
                  <Label>Agent *</Label>
                  <div className="relative">
                    <div
                      className="input-base flex cursor-pointer items-center justify-between"
                      onClick={() => setAgentDropdownOpen((v) => !v)}
                    >
                      <span className={selectedAgent ? 'text-ink' : 'text-graphite-light'}>
                        {selectedAgent?.fullName ?? 'Search agent…'}
                      </span>
                      <Search className="h-4 w-4 text-graphite-light" />
                    </div>
                    {agentDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setAgentDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-hairline bg-paper shadow-elevated">
                          <div className="border-b border-hairline p-2">
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type to search…"
                              value={agentSearch}
                              onChange={(e) => setAgentSearch(e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-[13px] text-ink outline-none placeholder:text-graphite-light focus:ring-2 focus:ring-accent/20"
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto py-1">
                            {filteredAgents.length === 0 ? (
                              <p className="px-4 py-3 text-[13px] text-graphite">No agents found</p>
                            ) : filteredAgents.map((a) => (
                              <button key={a.id} type="button"
                                onClick={() => { setSelectedAgent(a); setAgentDropdownOpen(false); setAgentSearch('') }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-ink hover:bg-mist">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/90 text-[10px] font-semibold text-white">
                                  {a.fullName.charAt(0)}
                                </div>
                                {a.fullName}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Property + Transaction type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label htmlFor="propertyRef">Property Reference *</Label>
                    <Input id="propertyRef" name="propertyRef" placeholder="e.g. Marina Heights, Unit 204" required disabled={isPending} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="transactionType">Transaction Type *</Label>
                    <select id="transactionType" name="transactionType" required className="input-base" disabled={isPending}>
                      <option value="off_plan">Off Plan</option>
                      <option value="secondary">Secondary Market</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="amount">Deal Value (AED) *</Label>
                    <Input id="amount" name="amount" type="number" min="1" step="0.01"
                      placeholder="2,500,000" required disabled={isPending}
                      value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </div>

                {/* Commission */}
                <div className="flex flex-col gap-3 rounded-xl bg-mist p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-ink">Gross Commission</p>
                    <div className="flex rounded-lg border border-hairline bg-paper overflow-hidden text-[12px]">
                      <button type="button"
                        onClick={() => setCommissionMode('pct')}
                        className={`px-3 py-1.5 font-medium transition-colors ${commissionMode === 'pct' ? 'bg-ink text-white' : 'text-graphite hover:bg-mist'}`}>
                        %
                      </button>
                      <button type="button"
                        onClick={() => setCommissionMode('aed')}
                        className={`px-3 py-1.5 font-medium transition-colors ${commissionMode === 'aed' ? 'bg-ink text-white' : 'text-graphite hover:bg-mist'}`}>
                        AED
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label className="text-[12px]">Commission %</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        placeholder="e.g. 2.5"
                        value={commissionMode === 'pct' ? commissionPct : (derivedPct > 0 ? derivedPct.toFixed(4) : '')}
                        onChange={(e) => { setCommissionMode('pct'); setCommissionPct(e.target.value) }}
                        disabled={isPending}
                        className="h-9 text-[13px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[12px]">Commission AED</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        placeholder="Auto-calculated"
                        value={commissionMode === 'aed' ? commissionAed : (grossCommission > 0 ? grossCommission.toFixed(2) : '')}
                        onChange={(e) => { setCommissionMode('aed'); setCommissionAed(e.target.value) }}
                        disabled={isPending}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* VAT */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[12px] font-medium text-ink">VAT (5%) — non-negotiable</p>
                      <p className="text-[11px] text-graphite">Is VAT included in the commission above?</p>
                    </div>
                    <div className="flex rounded-lg border border-hairline bg-paper overflow-hidden text-[12px]">
                      <button type="button" onClick={() => setVatIncluded('excluded')}
                        className={`px-3 py-1.5 font-medium transition-colors ${vatIncluded === 'excluded' ? 'bg-ink text-white' : 'text-graphite hover:bg-mist'}`}>
                        Excluded
                      </button>
                      <button type="button" onClick={() => setVatIncluded('included')}
                        className={`px-3 py-1.5 font-medium transition-colors ${vatIncluded === 'included' ? 'bg-ink text-white' : 'text-graphite hover:bg-mist'}`}>
                        Included
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {grossCommission > 0 && (
                    <div className="mt-1 rounded-xl border border-hairline bg-paper divide-y divide-hairline">
                      <div className="flex justify-between px-4 py-2.5 text-[13px]">
                        <span className="text-graphite">Gross Commission</span>
                        <span className="font-medium text-ink">AED {formatAed(grossCommission)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-[13px]">
                        <span className="text-graphite">VAT (5%)</span>
                        <span className="font-medium text-ink">AED {formatAed(vat)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-[13px] font-semibold">
                        <span className="text-ink">Total Payable</span>
                        <span className="text-ink">AED {formatAed(totalWithVat)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden fields */}
                <input type="hidden" name="vatIncluded" value={vatIncluded} />
                <input type="hidden" name="vatAmount" value={vat.toFixed(2)} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">
                <Button type="button" variant="secondary" size="md" onClick={() => { reset(); setOpen(false) }} disabled={isPending}>Cancel</Button>
                <Button type="submit" variant="primary" size="md" loading={isPending}
                  disabled={!selectedAgent || !amount || grossCommission <= 0}>
                  Create Deal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
