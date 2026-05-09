'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

const REQUIREMENTS = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
]

export default function UpdatePasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const allMet = REQUIREMENTS.every((r) => r.test(password))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updatePassword(formData)
      if (!result.ok) setError(result.error)
    })
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
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            error={!!error}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-graphite-light transition-colors hover:text-ink focus-visible:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Requirements */}
        {password.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1">
            {REQUIREMENTS.map((req) => {
              const met = req.test(password)
              return (
                <li key={req.label} className={cn('flex items-center gap-2 text-[12px]', met ? 'text-green-600' : 'text-graphite')}>
                  <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', met ? 'text-green-500' : 'text-hairline')} aria-hidden />
                  {req.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending}
        disabled={!allMet}
        className="w-full"
      >
        {isPending ? 'Saving…' : 'Set password'}
      </Button>
    </form>
  )
}
