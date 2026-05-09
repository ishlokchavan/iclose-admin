'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, verifyMfa } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

type Step = 'credentials' | 'mfa'

interface MfaState {
  factorId: string
  challengeId: string
}

export default function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('credentials')
  const [mfaState, setMfaState] = useState<MfaState | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Credentials step ──────────────────────────────────────────────────────

  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (result.mfaRequired && result.factorId && result.challengeId) {
        setMfaState({ factorId: result.factorId, challengeId: result.challengeId })
        setStep('mfa')
        return
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  // ─── MFA step ──────────────────────────────────────────────────────────────

  function handleMfaSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!mfaState) return

    const formData = new FormData(e.currentTarget)
    formData.set('factorId', mfaState.factorId)
    formData.set('challengeId', mfaState.challengeId)

    startTransition(async () => {
      const result = await verifyMfa(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  // ─── MFA screen ────────────────────────────────────────────────────────────

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMfaSubmit} noValidate className="flex flex-col gap-5">
        <div className="text-center">
          <p className="font-sans text-[15px] font-medium text-ink">Two-factor authentication</p>
          <p className="mt-1 text-[13px] text-graphite">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            className="text-center font-mono text-[22px] tracking-[0.3em]"
            autoFocus
            required
            disabled={isPending}
            error={!!error}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
          {isPending ? 'Verifying…' : 'Verify'}
        </Button>

        <button
          type="button"
          onClick={() => { setStep('credentials'); setError(null) }}
          className="text-center text-[13px] text-graphite transition-colors hover:text-ink"
        >
          ← Back to sign in
        </button>
      </form>
    )
  }

  // ─── Credentials screen ────────────────────────────────────────────────────

  return (
    <form onSubmit={handleCredentialsSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@iclose.ae"
          required
          disabled={isPending}
          error={!!error}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="applelink text-[12px]">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            disabled={isPending}
            error={!!error}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2',
              'text-graphite-light transition-colors hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded'
            )}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isPending} className="mt-1 w-full">
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
