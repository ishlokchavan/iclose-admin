/**
 * Seed the plans table with the 4 iClose subscription tiers.
 * Run: npx tsx db/seed-plans.ts
 */
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { plans } from './schema'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function seed() {
  const sql = postgres(process.env.DIRECT_URL!, { prepare: false })
  const db = drizzle(sql)

  await db.delete(plans)

  await db.insert(plans).values([
    {
      key: 'plus',
      label: 'Plus',
      tagline: 'Try iClose with zero commitment.',
      priceMonthlyAed: null,
      priceYearlyAed: null,
      billingCycle: 'free',
      agentSplitPct: 60,
      isStar: false,
      isActive: true,
      features: ['Stay completely anonymous', 'Access to the deal desk', 'Email support', 'Anonymous, always'],
      order: 1,
    },
    {
      key: 'pro',
      label: 'Pro',
      tagline: 'For active brokers closing every month.',
      priceMonthlyAed: '1500.00',
      priceYearlyAed: null,
      billingCycle: 'monthly',
      agentSplitPct: 80,
      isStar: false,
      isActive: true,
      features: ['Everything in Plus', 'iClose Academy training', 'Priority deal desk', 'Anonymous, always'],
      order: 2,
    },
    {
      key: 'pro_max',
      label: 'Pro Max',
      tagline: 'For independent brokers ready to scale solo.',
      priceMonthlyAed: null,
      priceYearlyAed: '40000.00',
      billingCycle: 'yearly',
      agentSplitPct: 90,
      isStar: true,
      isActive: true,
      features: ['Labour & visa included', 'Listings included', 'Dedicated relationship manager', 'iClose Academy + area playbooks', 'Anonymous, always'],
      order: 3,
    },
    {
      key: 'ultra',
      label: 'Ultra',
      tagline: 'Done for you. Run your practice, not the back office.',
      priceMonthlyAed: null,
      priceYearlyAed: '100000.00',
      billingCycle: 'yearly',
      agentSplitPct: 100,
      isStar: false,
      isActive: true,
      features: ['Everything done for you', 'Dedicated account manager', 'Finance, admin, and invoicing', 'Priority RM + concierge', 'Anonymous, always'],
      order: 4,
    },
  ])

  console.log('✅ Plans seeded successfully')
  console.log('   Plus    — Free       — 60% split')
  console.log('   Pro     — AED 1,500/mo — 80% split')
  console.log('   Pro Max — AED 40,000/yr — 90% split')
  console.log('   Ultra   — AED 100,000/yr — 100% split')

  await sql.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
