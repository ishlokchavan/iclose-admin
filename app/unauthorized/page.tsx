import { getProfile } from '@/lib/auth'
import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default async function UnauthorizedPage() {
  const profile = await getProfile()

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h1 className="font-display text-[22px] font-semibold text-ink">Access denied</h1>
          <p className="mt-2 text-[14px] text-graphite">
            You don&apos;t have permission to view this page.
            {profile && (
              <span className="block mt-1 font-mono text-[12px] text-graphite-light">
                Role: {profile.role} · Status: {profile.status}
              </span>
            )}
            {!profile && (
              <span className="block mt-1 text-[12px] text-red-500">No profile found for your account.</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard"
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-800">
            Back to dashboard
          </Link>
          <Link href="/portal"
            className="rounded-full bg-mist px-4 py-2 text-[13px] font-medium text-ink hover:bg-hairline">
            Agent portal
          </Link>
        </div>
      </div>
    </main>
  )
}
