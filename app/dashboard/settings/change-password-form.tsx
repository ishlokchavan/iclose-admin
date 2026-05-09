'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newPassword = fd.get('newPassword') as string
    const confirm = fd.get('confirmPassword') as string

    if (newPassword !== confirm) {
      setStatus('error')
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setStatus('error')
      setError('Password must be at least 8 characters')
      return
    }

    setStatus('idle')
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) {
        setStatus('error')
        setError(err.message)
      } else {
        setStatus('success');
        (e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-[13px] text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Password updated successfully
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input id="newPassword" name="newPassword" type={showNew ? 'text' : 'password'}
            required minLength={8} placeholder="Min. 8 characters" disabled={isPending} className="pr-10" />
          <button type="button" onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-light hover:text-graphite">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password"
          required placeholder="Repeat new password" disabled={isPending} />
      </div>

      <Button type="submit" variant="primary" size="md" loading={isPending} className="w-fit">
        Update Password
      </Button>
    </form>
  )
}
