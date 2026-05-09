import 'server-only'
import { db } from '@/db/client'
import { plans, PLAN_CONFIG, type Plan } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { asc } from 'drizzle-orm'

/**
 * Fetch all active plans from DB, ordered by display order.
 * Falls back to PLAN_CONFIG constants if DB is unavailable.
 */
export async function getActivePlans() {
  try {
    const rows = await db.query.plans.findMany({
      where: eq(plans.isActive, true),
      orderBy: [asc(plans.order)],
    })
    return rows
  } catch {
    // Fallback to hardcoded config
    return Object.entries(PLAN_CONFIG).map(([key, cfg], i) => ({
      id: key,
      key: key as Plan,
      label: cfg.label,
      tagline: null,
      priceMonthlyAed: cfg.monthlyAed ? String(cfg.monthlyAed) : null,
      priceYearlyAed: cfg.yearlyAed ? String(cfg.yearlyAed) : null,
      billingCycle: cfg.monthlyAed ? 'monthly' : cfg.yearlyAed ? 'yearly' : 'free',
      agentSplitPct: cfg.agentSplit * 100,
      isStar: key === 'pro_max',
      isActive: true,
      features: null,
      order: i + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  }
}

/**
 * Get a single plan by key.
 */
export async function getPlan(key: Plan) {
  try {
    const row = await db.query.plans.findFirst({
      where: eq(plans.key, key),
    })
    if (row) return row
  } catch { /* fallback */ }

  const cfg = PLAN_CONFIG[key]
  return {
    key,
    label: cfg.label,
    agentSplitPct: cfg.agentSplit * 100,
    priceMonthlyAed: cfg.monthlyAed ? String(cfg.monthlyAed) : null,
    priceYearlyAed: cfg.yearlyAed ? String(cfg.yearlyAed) : null,
    billingCycle: cfg.monthlyAed ? 'monthly' : cfg.yearlyAed ? 'yearly' : 'free',
    isStar: key === 'pro_max',
    isActive: true,
    features: null,
    order: 0,
  }
}

/**
 * Get agent split % from plan key.
 * Reads from DB, falls back to PLAN_CONFIG.
 */
export async function getAgentSplit(planKey: Plan): Promise<number> {
  const plan = await getPlan(planKey)
  return (plan.agentSplitPct ?? PLAN_CONFIG[planKey].agentSplit * 100) / 100
}
