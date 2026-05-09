import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  Users, Briefcase, HandCoins, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  applied:   { label: 'Applied',   className: 'badge-applied' },
  contacted: { label: 'Contacted', className: 'badge-contacted' },
  qualified: { label: 'Qualified', className: 'badge-qualified' },
  approved:  { label: 'Approved',  className: 'badge-approved' },
  active:    { label: 'Active',    className: 'badge-active' },
  rejected:  { label: 'Rejected',  className: 'badge-rejected' },
  inactive:  { label: 'Inactive',  className: 'badge-inactive' },
}

function KpiCard({ label, value, icon: Icon, href, accent }: {
  label: string; value: number | string; icon: React.ElementType; href: string; accent?: boolean
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
        <p className="font-display text-[32px] font-semibold leading-none tracking-tighter text-ink">{value}</p>
        <ArrowRight className="h-4 w-4 text-graphite-light opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const profile = await requireRole(['super_admin', 'content_manager', 'agent_manager', 'auditor'])
  const supabase = await createClient()

  // All queries via Supabase JS (HTTPS) — works on Vercel serverless
  const [
    { count: totalAgents },
    { count: activeAgents },
    { count: appliedAgents },
    { count: openDeals },
    { count: pendingAdvances },
    { data: recentAgents },
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('application_status', 'active'),
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('application_status', 'applied'),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('commission_advances').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('agents').select('id, full_name, application_status, is_licensed_agent, applied_at, source')
      .order('applied_at', { ascending: false }).limit(6),
  ])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="admin-page-title">{greeting()}, {profile.fullName?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="mt-1 text-[14px] text-graphite">Here&apos;s what&apos;s happening with iClose today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Agents" value={totalAgents ?? 0} icon={Users} href="/dashboard/agents" />
        <KpiCard label="Active Agents" value={activeAgents ?? 0} icon={CheckCircle2} href="/dashboard/agents?status=active" accent />
        <KpiCard label="Open Deals" value={openDeals ?? 0} icon={Briefcase} href="/dashboard/deals" />
        <KpiCard label="Advance Requests" value={pendingAdvances ?? 0} icon={HandCoins} href="/dashboard/commission" />
      </div>

      {(appliedAgents ?? 0) > 0 && (
        <Link href="/dashboard/agents?status=applied"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-[14px] font-medium text-amber-800">
            {appliedAgents} new agent application{appliedAgents !== 1 ? 's' : ''} waiting for review
          </p>
          <ArrowRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}

      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-ink">Recent Applications</h2>
            <p className="mt-0.5 text-[12px] text-graphite">Latest agent registrations</p>
          </div>
          <Link href="/dashboard/agents" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!recentAgents?.length ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mist">
              <Users className="h-5 w-5 text-graphite-light" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-ink">No agents yet</p>
              <p className="mt-0.5 text-[13px] text-graphite">Agent registrations will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {recentAgents.map((agent: Record<string, unknown>) => {
              const status = STATUS_CONFIG[agent.application_status as string] ?? STATUS_CONFIG.applied
              return (
                <Link key={agent.id as string} href={`/dashboard/agents/${agent.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-fog">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/90">
                    <span className="font-sans text-[13px] font-semibold text-white">
                      {(agent.full_name as string).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{agent.full_name as string}</p>
                    <p className="text-[12px] text-graphite">
                      {agent.is_licensed_agent ? 'Licensed Agent' : 'Connector / Referrer'}
                      {agent.source ? ` · ${agent.source}` : ''}
                    </p>
                  </div>
                  <span className={status.className}>{status.label}</span>
                  <div className="flex items-center gap-1 text-[12px] text-graphite-light">
                    <Clock className="h-3 w-3" />
                    {formatDate(agent.applied_at as string)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-graphite-light" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Manage Agents', desc: 'Review and update agent status', href: '/dashboard/agents', icon: Users },
          { label: 'View Deals', desc: 'Track deals and commissions', href: '/dashboard/deals', icon: Briefcase },
          { label: 'Commission Queue', desc: 'Approve advance requests', href: '/dashboard/commission', icon: TrendingUp },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="card-mist flex items-center gap-4 p-5 transition-shadow hover:shadow-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper shadow-sm">
              <item.icon className="h-4 w-4 text-graphite" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink">{item.label}</p>
              <p className="truncate text-[12px] text-graphite">{item.desc}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-graphite-light" />
          </Link>
        ))}
      </div>
    </div>
  )
}
