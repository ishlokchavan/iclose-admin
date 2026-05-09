'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Handles Supabase invite links: /login#access_token=...&type=invite
 * Exchanges the token for a session and prompts the user to set a password.
 */
export default function InviteHandler() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'loading' | 'set-password' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    // Parse the hash fragment
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || type !== 'invite') {
      setStep('error')
      setError('Invalid invite link.')
      return
    }

    // Exchange tokens to establish session
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    }).then(({ error }) => {
      if (error) {
        setStep('error')
        setError('Invite link has expired or is invalid. Please contact your admin.')
      } else {
        setStep('set-password')
        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    })
  }, [])

  async function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Passwords do not match.')
      setIsPending(false)
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      setIsPending(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setIsPending(false)
      return
    }

    // Always go to portal first — server will redirect if wrong role
    router.push('/portal')
    router.refresh()
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        <p className="text-[13px] text-graphite">Verifying invite…</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-[14px] text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSetPassword} className="flex flex-col gap-5">
      <div className="text-center">
        <p className="font-sans text-[15px] font-medium text-ink">Set your password</p>
        <p className="mt-1 text-[13px] text-graphite">Choose a strong password to activate your account.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Min. 12 characters"
          required
          minLength={12}
          disabled={isPending}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Repeat your password"
          required
          disabled={isPending}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
        {isPending ? 'Activating…' : 'Activate account'}
      </Button>
    </form>
  )
}
