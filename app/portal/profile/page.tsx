import type { Metadata } from 'next'
import { requireRole, getProfile } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { PLAN_CONFIG } from '@/db/schema'
import { User, Shield, CreditCard } from 'lucide-react'

export const metadata: Metadata = { title: 'My Profile' }

export default async function PortalProfilePage() {
  await requireRole(['agent'])
  const profile = await getProfile()

  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = profile ? await (sb as any).from('agents')
    .select('id, is_licensed_agent, deal_volume, kyc_status, plan, applied_at')
    .eq('profile_id', profile.id).single() : { data: null }

  const plan = agent?.plan ?? 'plus'
  const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]

  const KYC_COLORS: Record<string, string> = {
    not_started: 'text-graphite', pending: 'text-yellow-600',
    verified: 'text-emerald-600', rejected: 'text-red-600',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="admin-page-title">My Profile</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <User className="h-4 w-4 text-graphite" />
            <h2 className="font-display text-[15px] font-semibold text-ink">Profile</h2>
          </div>
          <div className="divide-y divide-hairline">
            {[
              { label: 'Full Name', value: profile?.fullName ?? '—' },
              { label: 'Plan', value: `${planConfig?.label ?? plan} — ${((planConfig?.agentSplit ?? 0.6) * 100).toFixed(0)}% split` },
              { label: 'Type', value: agent?.is_licensed_agent ? 'Licensed Agent' : 'Connector / Referrer' },
              { label: 'Deal Volume', value: agent?.deal_volume ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <p className="text-[13px] text-graphite">{label}</p>
                <p className="text-[13px] font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <Shield className="h-4 w-4 text-graphite" />
            <h2 className="font-display text-[15px] font-semibold text-ink">KYC Verification</h2>
          </div>
          <div className="px-6 py-5">
            <p className={`font-semibold capitalize text-[15px] ${KYC_COLORS[agent?.kyc_status ?? 'not_started']}`}>
              {(agent?.kyc_status ?? 'not_started').replace('_', ' ')}
            </p>
            <p className="mt-2 text-[13px] text-graphite">
              {agent?.kyc_status === 'verified' ? 'Your identity has been verified.' :
               agent?.kyc_status === 'pending' ? 'Your documents are under review.' :
               agent?.kyc_status === 'rejected' ? 'Your KYC was rejected. Please contact support.' :
               'KYC verification is required to receive commissions. Please contact your manager.'}
            </p>
          </div>
        </div>
        <div className="card-surface overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <CreditCard className="h-4 w-4 text-graphite" />
            <h2 className="font-display text-[15px] font-semibold text-ink">Payout Details</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-[13px] text-graphite">
              Payout details are managed securely by your account manager.
              Contact <span className="font-medium text-ink">support@iclose.ae</span> to update your banking information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
