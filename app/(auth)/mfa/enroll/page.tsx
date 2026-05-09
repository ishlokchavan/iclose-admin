import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import MfaEnrollForm from './mfa-enroll-form'
import { enrollMfa } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Set Up Two-Factor Authentication' }

export default async function MfaEnrollPage() {
  // Must be logged in — any role can enroll MFA
  await requireRole(['super_admin', 'content_manager', 'agent_manager', 'agent', 'auditor'])

  // Start enrollment server-side — get QR code
  const result = await enrollMfa()

  if (!result.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px] text-center">
          <p className="text-[14px] text-red-600">{result.error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1d1d1f 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[440px] animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink shadow-elevated">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm0 3a9 9 0 110 18A9 9 0 0114 5zm-1 4v6.5l4.5 2.7-.9 1.5L11 16.5V9h2z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink">
              Set up authenticator
            </h1>
            <p className="mt-1 text-[13px] text-graphite">
              Scan the QR code with your authenticator app.
            </p>
          </div>
        </div>

        <div className="card-surface px-8 py-8">
          <MfaEnrollForm
            factorId={result.factorId}
            qrCode={result.qrCode}
            secret={result.secret}
          />
        </div>
      </div>
    </main>
  )
}
