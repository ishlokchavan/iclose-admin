import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Overview',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="mt-1 text-[14px] text-graphite">
          KPI cards and quick stats — coming in Phase 3.
        </p>
      </div>

      {/* Placeholder KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {['Total Agents', 'Active Agents', 'Open Deals', 'Commission Pending'].map((label) => (
          <div key={label} className="card-mist flex flex-col gap-2 p-5">
            <p className="admin-section-label">{label}</p>
            <div className="h-8 w-20 animate-pulse rounded-lg bg-hairline" />
          </div>
        ))}
      </div>

      {/* Phase callout */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-5">
        <p className="font-sans text-[13px] font-medium text-accent">
          Phase 3 — Full KPI dashboard, charts, and recent activity feed will be built here.
        </p>
      </div>
    </div>
  )
}
