'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Phase 1: call supabase.auth.resetPasswordForEmail(email, { redirectTo })
      await new Promise((r) => setTimeout(r, 800)) // stub delay
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden />
        <div>
          <p className="font-sans text-[15px] font-medium text-ink">Check your email</p>
          <p className="mt-1 text-[13px] text-graphite">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-ink">{email}</span>.
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
          disabled={isLoading}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isLoading} className="w-full">
        {isLoading ? 'Sending…' : 'Send reset link'}
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
