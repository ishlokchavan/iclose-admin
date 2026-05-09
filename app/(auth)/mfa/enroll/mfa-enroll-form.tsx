'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmMfaEnrollment } from '@/lib/actions/auth'

interface Props {
  factorId: string
  qrCode: string
  secret: string
}

export default function MfaEnrollForm({ factorId, qrCode, secret }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [copied, setCopied] = useState(false)

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('factorId', factorId)

    startTransition(async () => {
      const result = await confirmMfaEnrollment(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEnrolled(true)
    })
  }

  if (enrolled) {
    return (
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden />
        <div>
          <p className="font-sans text-[15px] font-medium text-ink">
            Two-factor authentication enabled
          </p>
          <p className="mt-1 text-[13px] text-graphite">
            Your account is now protected with TOTP.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => { router.push('/dashboard'); router.refresh() }}
        >
          Continue to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* QR Code */}
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl border border-hairline bg-white p-3">
          <Image
            src={qrCode}
            alt="Scan this QR code with your authenticator app"
            width={160}
            height={160}
            unoptimized
          />
        </div>
        <p className="text-center text-[12px] text-graphite">
          Use Google Authenticator, Authy, or any TOTP app.
        </p>
      </div>

      {/* Manual entry */}
      <div className="rounded-xl bg-mist px-4 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-graphite-light">
          Manual entry key
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all font-mono text-[12px] text-ink">{secret}</code>
          <button
            type="button"
            onClick={copySecret}
            className="shrink-0 text-graphite transition-colors hover:text-ink"
            aria-label="Copy secret key"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Verify */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Enter the 6-digit code to confirm</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            className="text-center font-mono text-[22px] tracking-[0.3em]"
            required
            disabled={isPending}
            error={!!error}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
          {isPending ? 'Verifying…' : 'Enable two-factor auth'}
        </Button>
      </form>
    </div>
  )
}
