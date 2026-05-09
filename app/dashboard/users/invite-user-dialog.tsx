'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteAdminUser } from '@/lib/actions/users'
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to everything' },
  { value: 'agent_manager', label: 'Agent Manager', desc: 'Manage agents and deals' },
  { value: 'content_manager', label: 'Content Manager', desc: 'Edit CMS content' },
  { value: 'auditor', label: 'Auditor', desc: 'Read-only access to logs' },
]

export default function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await inviteAdminUser(fd)
      if (result.ok) {
        setStatus('success')
        setTimeout(() => { setOpen(false); setStatus('idle') }, 1500)
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Invite User
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md animate-fade-in rounded-apple bg-paper shadow-elevated">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">Invite Admin User</h2>
                <p className="mt-0.5 text-[13px] text-graphite">They'll receive an email to set their password.</p>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite hover:bg-mist">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
              {status === 'error' && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}
                </div>
              )}
              {status === 'success' && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-[13px] text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />Invite sent successfully!
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" placeholder="Jane Smith" required disabled={isPending} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="jane@iclose.ae" required disabled={isPending} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Role *</Label>
                <div className="flex flex-col gap-2">
                  {ROLES.map((role) => (
                    <label key={role.value} className="flex items-start gap-3 rounded-xl border border-hairline p-3 cursor-pointer hover:bg-mist transition-colors has-[:checked]:border-ink has-[:checked]:bg-ink/5">
                      <input type="radio" name="role" value={role.value} required className="mt-0.5" defaultChecked={role.value === 'agent_manager'} />
                      <div>
                        <p className="text-[13px] font-medium text-ink">{role.label}</p>
                        <p className="text-[12px] text-graphite">{role.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={isPending} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" size="md" loading={isPending} className="flex-1">Send Invite</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
