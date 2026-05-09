/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getAgent } from '@/lib/actions/agents'
import { StatusBadge } from '@/components/dashboard/agents/status-badge'
import { StatusTransition } from '@/components/dashboard/agents/status-transition'
import { NotesThread } from '@/components/dashboard/agents/notes-thread'
import { StatusTimeline } from '@/components/dashboard/agents/status-timeline'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, Briefcase, Globe, BadgePercent } from 'lucide-react'
import { PLAN_CONFIG } from '@/db/schema'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const agent = await getAgent(id)
  return { title: agent ? agent.full_name : 'Agent Not Found' }
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])
  const { id } = await params
  const agent = await getAgent(id)

  if (!agent) notFound()

  const isReadOnly = profile.role === 'auditor' || profile.role === 'content_manager'

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/dashboard/agents"
        className="flex items-center gap-1.5 text-[13px] text-graphite transition-colors hover:text-ink w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All agents
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/90 text-white">
            <span className="font-display text-[20px] font-semibold">
              {agent.full_name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="admin-page-title">{agent.full_name}</h1>
              <StatusBadge status={agent.application_status} />
            </div>
            <p className="mt-0.5 text-[13px] text-graphite">
              {agent.is_licensed_agent ? 'Licensed Agent' : 'Connector / Referrer'}
              {agent.deal_volume ? ` · ${agent.deal_volume} deals/month` : ''}
            </p>
          </div>
        </div>

        {/* Status transitions */}
        {!isReadOnly && (
          <StatusTransition
            agentId={agent.id}
            currentStatus={agent.application_status}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — details */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Info card */}
          <div className="card-surface divide-y divide-hairline overflow-hidden">
            <div className="px-6 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">Application Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-hairline">
              {[
                { label: 'Applied', value: formatDateTime(agent.applied_at), icon: Calendar },
                { label: 'Approved', value: formatDate(agent.approved_at), icon: Calendar },
                { label: 'KYC Status', value: agent.kyc_status.replace('_', ' '), icon: User },
                { label: 'Deal Volume', value: agent.deal_volume ?? '—', icon: Briefcase },
                { label: 'Plan', value: `${PLAN_CONFIG[(agent.plan ?? 'plus') as keyof typeof PLAN_CONFIG].label} — ${(PLAN_CONFIG[(agent.plan ?? 'plus') as keyof typeof PLAN_CONFIG].agentSplit * 100).toFixed(0)}% split`, icon: BadgePercent },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex flex-col gap-1 px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-graphite-light" />
                    <p className="admin-section-label">{label}</p>
                  </div>
                  <p className="text-[14px] capitalize text-ink">{value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Attribution */}
            {(agent.source ?? agent.utm_source) && (
              <div className="px-6 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe className="h-3.5 w-3.5 text-graphite-light" />
                  <p className="admin-section-label">Attribution</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.source && (
                    <span className="rounded-full bg-mist px-3 py-1 text-[12px] text-graphite">
                      source: {agent.source}
                    </span>
                  )}
                  {agent.utm_source && (
                    <span className="rounded-full bg-mist px-3 py-1 text-[12px] text-graphite">
                      utm_source: {agent.utm_source}
                    </span>
                  )}
                  {agent.utm_medium && (
                    <span className="rounded-full bg-mist px-3 py-1 text-[12px] text-graphite">
                      utm_medium: {agent.utm_medium}
                    </span>
                  )}
                  {agent.utm_campaign && (
                    <span className="rounded-full bg-mist px-3 py-1 text-[12px] text-graphite">
                      utm_campaign: {agent.utm_campaign}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card-surface overflow-hidden">
            <div className="border-b border-hairline px-6 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">Internal Notes</h2>
              <p className="mt-0.5 text-[12px] text-graphite">Visible to admin staff only.</p>
            </div>
            <div className="px-6 py-4">
              {isReadOnly ? (
                <div className="flex flex-col gap-3">
                  {agent.notes?.length === 0 ? (
                    <p className="text-[13px] text-graphite">No notes.</p>
                  ) : (
                    agent.notes?.map((note) => (
                      <div key={note.id} className="rounded-xl bg-mist px-4 py-3">
                        <p className="text-[13px] font-medium text-ink">{(note.author as any)?.full_name}</p>
                        <p className="mt-1 text-[13px] text-ink/80">{note.body}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <NotesThread agentId={agent.id} notes={agent.notes ?? []} />
              )}
            </div>
          </div>
        </div>

        {/* Right column — timeline */}
        <div className="flex flex-col gap-4">
          <div className="card-surface overflow-hidden">
            <div className="border-b border-hairline px-6 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">Status History</h2>
            </div>
            <div className="px-6 py-4">
              <StatusTimeline history={agent.agent_status_history ?? []} />
            </div>
          </div>

          {/* Assigned to */}
          <div className="card-surface px-6 py-4">
            <p className="admin-section-label mb-2">Assigned To</p>
            {agent.profiles ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/90 text-[11px] font-semibold text-white">
                  {agent.profiles.fullName.charAt(0)}
                </div>
                <span className="text-[14px] text-ink">{agent.profiles.fullName}</span>
              </div>
            ) : (
              <p className="text-[13px] text-graphite">Unassigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
