import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Portal',
}

export default function PortalPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Agent Portal</p>
        <h1 className="admin-page-title">Welcome</h1>
        <p className="mt-1 text-[14px] text-graphite">
          Your deals, commission, and profile — coming in Phase 5.
        </p>
      </div>

      <div className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-5">
        <p className="font-sans text-[13px] font-medium text-accent">
          Phase 5 — Agent self-service portal: deals, earnings, advance requests, and KYC profile.
        </p>
      </div>
    </div>
  )
}
