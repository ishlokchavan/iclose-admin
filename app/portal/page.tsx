import type { Metadata } from 'next'
import { requireRole, getProfile } from '@/lib/auth'
import { getPortalStats } from '@/lib/actions/portal'
import { Briefcase, HandCoins, TrendingUp, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Agent Portal' }

export default async function PortalPage() {
  await requireRole(['agent'])
  const [profile, stats] = await Promise.all([getProfile(), getPortalStats()])

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Agent Portal</p>
        <h1 className="admin-page-title">Welcome, {profile?.fullName.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-[14px] text-graphite">Here's your activity summary.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Deals', value: stats.totalDeals, icon: Briefcase, href: '/portal/deals' },
          { label: 'Signed Deals', value: stats.activeDeals, icon: CheckCircle2, href: '/portal/deals' },
          { label: 'Commission Earned', value: formatAed(stats.commissionEarned), icon: HandCoins, href: '/portal/commission' },
          { label: 'Commission Paid', value: formatAed(stats.commissionPaid), icon: TrendingUp, href: '/portal/commission' },
        ].map((item) => (
          <Link key={item.label} href={item.href}
            className="card-surface flex flex-col gap-4 p-6 hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between">
              <p className="admin-section-label">{item.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mist">
                <item.icon className="h-4 w-4 text-graphite" />
              </div>
            </div>
            <p className="font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
              {item.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { label: 'My Deals', desc: 'View your deal history', href: '/portal/deals', icon: Briefcase },
          { label: 'Request Advance', desc: 'Early commission on signed deals', href: '/portal/advance', icon: TrendingUp },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="card-mist flex items-center gap-4 p-5 hover:shadow-card transition-shadow">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper shadow-sm">
              <item.icon className="h-4 w-4 text-graphite" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-ink">{item.label}</p>
              <p className="text-[12px] text-graphite">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
