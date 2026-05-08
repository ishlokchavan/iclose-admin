import type { Metadata } from 'next'
import ForgotPasswordForm from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Reset Password',
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      {/* Background texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, #1d1d1f 1px, transparent 1px), radial-gradient(circle at 75% 75%, #1d1d1f 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[400px] animate-fade-in">
        {/* Logo + header */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink shadow-elevated">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm0 3a9 9 0 110 18A9 9 0 0114 5zm-1 4v6.5l4.5 2.7-.9 1.5L11 16.5V9h2z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink">
              Reset your password
            </h1>
            <p className="mt-1 text-[13px] text-graphite">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
        </div>

        <div className="card-surface px-8 py-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-8 text-center text-[12px] text-graphite-light">
          © {new Date().getFullYear()} iClose. All rights reserved.
        </p>
      </div>
    </main>
  )
}
