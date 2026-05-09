import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Access Denied' }

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex max-w-[360px] flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <ShieldX className="h-8 w-8 text-red-500" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink">
            Access denied
          </h1>
          <p className="mt-2 text-[14px] text-graphite">
            You don&apos;t have permission to view this page. Contact your administrator if you think this is a mistake.
          </p>
        </div>
        <Button asChild variant="secondary" size="md">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  )
}
