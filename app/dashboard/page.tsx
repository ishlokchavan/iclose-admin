import type { Metadata } from 'next'
import { db } from '@/db/client'
import { agents, deals, commissionAdvances } from '@/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  Users, Briefcase, HandCoins, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getKpis() {
  const [
    totalAgents,
    activeAgents,
    appliedAgents,
    openDeals,
    pendingAdvances,
  ] = await Promise.all([
    db.select({ count: count() }).from(agents),
    db.select({ count: count() }).from(agents).where(eq(agents.applicationStatus, 'active')),
    db.select({ count: count() }).from(agents).where(eq(agents.applicationStatus, 'applied')),
    db.select({ count: count() }).from(deals).where(eq(deals.status, 'pending')),
    db.select({ count: count() }).from(commissionAdvances).where(eq(commissionAdvances.status, 'requested')),
  ])

  return {
    totalAgents: totalAgents[0]?.count ?? 0,
    activeAgents: activeAgents[0]?.count ?? 0,
    appliedAgents: appliedAgents[0]?.count ?? 0,
    openDeals: openDeals[0]?.count ?? 0,
    pendingAdvances: pendingAdvances[0]?.count ?? 0,
  }
}

async function getRecentAgents() {
  return db.query.agents.findMany({
    orderBy: (a, { desc }) => [desc(a.appliedAt)],
    limit: 6,
    columns: {
      id: true,
      fullName: true,
      applicationStatus: true,
      isLicensedAgent: true,
      appliedAt: true,
      source: true,
    },
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  href: string
  accent?: boolean
}) {
  return (
    <Link href={href} className="card-surface group flex flex-col gap-4 p-6 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between">
        <p className="admin-section-label">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-accent/10' : 'bg-mist'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-accent' : 'text-graphite'}`} aria-hidden />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-display text-[32px] font-semibold leading-none tracking-tighter text-ink">
          {value}
        </p>
        <ArrowRight className="h-4 w-4 text-graphite-light opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
    </Link>
  )
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  applied:   { label: 'Applied',   className: 'badge-applied' },
  contacted: { label: 'Contacted', className: 'badge-contacted' },
  qualified: { label: 'Qualified', className: 'badge-qualified' },
  approved:  { label: 'Approved',  className: 'badge-approved' },
  active:    { label: 'Active',    className: 'badge-active' },
  rejected:  { label: 'Rejected',  className: 'badge-rejected' },
  inactive:  { label: 'Inactive',  className: 'badge-inactive' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const profile = await requireRole(['super_admin', 'content_manager', 'agent_manager', 'auditor'])
  const [kpis, recentAgents] = await Promise.all([getKpis(), getRecentAgents()])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="admin-page-title">
          {greeting()}, {profile.fullName.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-[14px] text-graphite">
          Here&apos;s what&apos;s happening with iClose today.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Agents"
          value={kpis.totalAgents}
          icon={Users}
          href="/dashboard/agents"
        />
        <KpiCard
          label="Active Agents"
          value={kpis.activeAgents}
          icon={CheckCircle2}
          href="/dashboard/agents?status=active"
          accent
        />
        <KpiCard
          label="Open Deals"
          value={kpis.openDeals}
          icon={Briefcase}
          href="/dashboard/deals"
        />
        <KpiCard
          label="Advance Requests"
          value={kpis.pendingAdvances}
          icon={HandCoins}
          href="/dashboard/commission"
        />
      </div>

      {/* Alert strip — new applications */}
      {kpis.appliedAgents > 0 && (
        <Link
          href="/dashboard/agents?status=applied"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="flex-1 text-[14px] font-medium text-amber-800">
            {kpis.appliedAgents} new agent application{kpis.appliedAgents !== 1 ? 's' : ''} waiting for review
          </p>
          <ArrowRight className="h-4 w-4 text-amber-600" aria-hidden />
        </Link>
      )}

      {/* Recent agents table */}
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-ink">Recent Applications</h2>
            <p className="mt-0.5 text-[12px] text-graphite">Latest agent registrations</p>
          </div>
          <Link
            href="/dashboard/agents"
            className="flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {recentAgents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mist">
              <Users className="h-5 w-5 text-graphite-light" aria-hidden />
            </div>
            <div>
              <p className="text-[14px] font-medium text-ink">No agents yet</p>
              <p className="mt-0.5 text-[13px] text-graphite">
                Agent registrations will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {recentAgents.map((agent) => {
              const status = STATUS_CONFIG[agent.applicationStatus] ?? STATUS_CONFIG.applied
              return (
                <Link
                  key={agent.id}
                  href={`/dashboard/agents/${agent.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-fog"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/90">
                    <span className="font-sans text-[13px] font-semibold text-white">
                      {agent.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{agent.fullName}</p>
                    <p className="text-[12px] text-graphite">
                      {agent.isLicensedAgent ? 'Licensed Agent' : 'Connector / Referrer'}
                      {agent.source ? ` · ${agent.source}` : ''}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={status.className}>{status.label}</span>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-[12px] text-graphite-light">
                    <Clock className="h-3 w-3" aria-hidden />
                    {formatDate(agent.appliedAt)}
                  </div>

                  <ArrowRight className="h-4 w-4 text-graphite-light" aria-hidden />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Manage Agents', desc: 'Review and update agent status', href: '/dashboard/agents', icon: Users },
          { label: 'View Deals', desc: 'Track deals and commissions', href: '/dashboard/deals', icon: Briefcase },
          { label: 'Commission Queue', desc: 'Approve advance requests', href: '/dashboard/commission', icon: TrendingUp },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card-mist flex items-center gap-4 p-5 transition-shadow hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper shadow-sm">
              <item.icon className="h-4 w-4 text-graphite" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink">{item.label}</p>
              <p className="truncate text-[12px] text-graphite">{item.desc}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-graphite-light" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  )
}
