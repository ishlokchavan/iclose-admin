import type { Metadata } from 'next'
import { requireRole, getProfile } from '@/lib/auth'
import { db } from '@/db/client'
import { agents } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { User, Shield, CreditCard } from 'lucide-react'

export const metadata: Metadata = { title: 'My Profile' }

export default async function PortalProfilePage() {
  await requireRole(['agent'])
  const profile = await getProfile()

  const agent = profile ? await db.query.agents.findFirst({
    where: eq(agents.profileId, profile.id),
    columns: { id: true, isLicensedAgent: true, dealVolume: true, kycStatus: true, appliedAt: true },
  }) : null

  const KYC_COLORS: Record<string, string> = {
    not_started: 'text-graphite',
    pending:     'text-yellow-600',
    verified:    'text-emerald-600',
    rejected:    'text-red-600',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="admin-page-title">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Profile */}
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <User className="h-4 w-4 text-graphite" />
            <h2 className="font-display text-[15px] font-semibold text-ink">Profile</h2>
          </div>
          <div className="divide-y divide-hairline">
            {[
              { label: 'Full Name', value: profile?.fullName ?? '—' },
              { label: 'Role', value: 'Agent' },
              { label: 'Type', value: agent?.isLicensedAgent ? 'Licensed Agent' : 'Connector / Referrer' },
              { label: 'Deal Volume', value: agent?.dealVolume ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <p className="text-[13px] text-graphite">{label}</p>
                <p className="text-[13px] font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KYC */}
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <Shield className="h-4 w-4 text-graphite" />
            <h2 className="font-display text-[15px] font-semibold text-ink">KYC Verification</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className={`font-semibold capitalize text-[15px] ${KYC_COLORS[agent?.kycStatus ?? 'not_started']}`}>
                {(agent?.kycStatus ?? 'not_started').replace('_', ' ')}
              </div>
            </div>
            <p className="mt-2 text-[13px] text-graphite">
              {agent?.kycStatus === 'verified'
                ? 'Your identity has been verified.'
                : agent?.kycStatus === 'pending'
                ? 'Your documents are under review.'
                : agent?.kycStatus === 'rejected'
                ? 'Your KYC was rejected. Please contact support.'
                : 'KYC verification is required to receive commissions. Please contact your manager.'}
            </p>
          </div>
        </div>

        {/* Payout */}
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
