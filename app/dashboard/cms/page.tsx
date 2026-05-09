import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getSiteConfig, getPlansForCms, getFaqs, getFormSchema } from '@/lib/actions/cms'
import { Suspense } from 'react'
import SiteConfigForm from './site-config-form'
import PlansEditor from './plans-editor'
import FaqsEditor from './faqs-editor'
import FormSchemaEditor from './form-schema-editor'

export const metadata: Metadata = { title: 'CMS' }

function Tab({ id, label, active }: { id: string; label: string; active: boolean }) {
  return (
    <a href={`?tab=${id}`}
      className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${
        active ? 'bg-ink text-white' : 'text-graphite hover:bg-mist hover:text-ink'
      }`}>
      {label}
    </a>
  )
}

export default async function CmsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await requireRole(['super_admin', 'content_manager'])
  const { tab = 'site' } = await searchParams

  const [siteConfig, plans, faqs, formSchema] = await Promise.all([
    getSiteConfig(),
    getPlansForCms(),
    getFaqs(),
    getFormSchema(),
  ])

  const tabs = [
    { id: 'site', label: 'Site Config' },
    { id: 'plans', label: 'Plans' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'form', label: 'Registration Form' },
    ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Content</p>
        <h1 className="admin-page-title">CMS</h1>
        <p className="mt-1 text-[14px] text-graphite">Edit site content, plans, FAQs, and form fields.</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl bg-mist p-1 w-fit">
        {tabs.map((t) => <Tab key={t.id} {...t} active={tab === t.id} />)}
      </div>

      {/* Tab content */}
      <Suspense fallback={<div className="card-surface h-64 animate-pulse rounded-xl bg-mist/50" />}>
        {tab === 'site' && <SiteConfigForm config={siteConfig} />}
        {tab === 'plans' && <PlansEditor plans={plans} />}
        {tab === 'faqs' && <FaqsEditor faqs={faqs} />}
        {tab === 'form' && <FormSchemaEditor schema={formSchema} />}
      </Suspense>
    </div>
  )
}
