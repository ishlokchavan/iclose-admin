import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { FileText } from 'lucide-react'

export const metadata: Metadata = { title: 'CMS' }

export default async function CmsPage() {
  await requireRole(['super_admin', 'content_manager', 'auditor'])
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Content</p>
        <h1 className="admin-page-title">CMS</h1>
        <p className="mt-1 text-[14px] text-graphite">Edit site content, sections, FAQs, plans, media library, and form schemas.</p>
      </div>
      <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
          <FileText className="h-6 w-6 text-graphite-light" />
        </div>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Coming in Phase 6</p>
          <p className="mt-1 max-w-sm text-[14px] text-graphite">Schema-driven section editors, media library, FAQs, plans, form schema editor, and public CMS API.</p>
        </div>
        <div className="mt-2 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3">
          <p className="text-[13px] font-medium text-accent">Phase 6 — Full CMS + /api/cms/* endpoints</p>
        </div>
      </div>
    </div>
  )
}
