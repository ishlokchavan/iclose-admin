import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { PLAN_CONFIG, type Plan } from '@/db/schema'

export async function getActivePlans() {
  try {
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from('plans').select('*').eq('is_active', true).order('order')
    return data ?? []
  } catch {
    return Object.entries(PLAN_CONFIG).map(([key, cfg], i) => ({
      id: key, key: key as Plan, label: cfg.label, tagline: null,
      priceMonthlyAed: cfg.monthlyAed ? String(cfg.monthlyAed) : null,
      priceYearlyAed: cfg.yearlyAed ? String(cfg.yearlyAed) : null,
      billingCycle: cfg.monthlyAed ? 'monthly' : cfg.yearlyAed ? 'yearly' : 'free',
      agentSplitPct: cfg.agentSplit * 100, isStar: key === 'pro_max',
      isActive: true, features: null, order: i + 1, createdAt: new Date(), updatedAt: new Date(),
    }))
  }
}

export async function getPlan(key: Plan) {
  try {
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from('plans').select('*').eq('key', key).single()
    if (data) return data
  } catch {}
  const cfg = PLAN_CONFIG[key]
  return { key, label: cfg.label, agentSplitPct: cfg.agentSplit * 100, priceMonthlyAed: cfg.monthlyAed ? String(cfg.monthlyAed) : null, priceYearlyAed: cfg.yearlyAed ? String(cfg.yearlyAed) : null, billingCycle: cfg.monthlyAed ? 'monthly' : cfg.yearlyAed ? 'yearly' : 'free', isStar: key === 'pro_max', isActive: true, features: null, order: 0 }
}

export async function getAgentSplit(planKey: Plan): Promise<number> {
  const plan = await getPlan(planKey)
  return (plan.agentSplitPct ?? PLAN_CONFIG[planKey].agentSplit * 100) / 100
}
