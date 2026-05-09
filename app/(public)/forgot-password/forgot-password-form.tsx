'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/lib/actions/auth'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await resetPassword(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden />
        <div>
          <p className="font-sans text-[15px] font-medium text-ink">Check your email</p>
          <p className="mt-1 text-[13px] text-graphite">
            If <span className="font-medium text-ink">{email}</span> has an account,
            you&apos;ll receive a reset link shortly.
          </p>
        </div>
        <Link href="/login" className="applelink mt-2 text-[13px]">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          error={!!error}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-[13px] text-graphite transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to sign in
      </Link>
    </form>
  )
}
