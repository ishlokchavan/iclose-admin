'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSiteConfig } from '@/lib/actions/cms'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function SiteConfigForm({ config }: { config: Record<string, unknown> | null }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const c = config ?? {}
  const social = (c.social_json ?? {}) as Record<string, string>
  const seo = (c.seo_json ?? {}) as Record<string, string>
  const analytics = (c.analytics_json ?? {}) as Record<string, string>

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateSiteConfig(fd)
      setStatus(result.ok ? 'success' : 'error')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-[13px] text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Saved successfully
        </div>
      )}

      {/* Contact */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={c.contact_email as string ?? ''} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input id="whatsapp" name="whatsapp" defaultValue={c.whatsapp as string ?? ''} placeholder="+971501234567" disabled={isPending} />
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Social Links</h2>
        <div className="grid grid-cols-2 gap-4">
          {['instagram', 'linkedin', 'twitter', 'youtube'].map((platform) => (
            <div key={platform} className="flex flex-col gap-1.5">
              <Label htmlFor={`social.${platform}`} className="capitalize">{platform}</Label>
              <Input id={`social.${platform}`} name={`social.${platform}`} type="url" defaultValue={social[platform] ?? ''} placeholder={`https://${platform}.com/iclose`} disabled={isPending} />
            </div>
          ))}
        </div>
      </div>

      {/* SEO */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">SEO</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo.title">Title <span className="text-graphite-light">(max 70 chars)</span></Label>
            <Input id="seo.title" name="seo.title" defaultValue={seo.title ?? ''} maxLength={70} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo.description">Description <span className="text-graphite-light">(max 160 chars)</span></Label>
            <textarea id="seo.description" name="seo.description" defaultValue={seo.description ?? ''} maxLength={160} rows={3} disabled={isPending} className="input-base resize-none py-3 text-[13px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo.keywords">Keywords</Label>
            <Input id="seo.keywords" name="seo.keywords" defaultValue={seo.keywords ?? ''} placeholder="real estate, dubai, commission" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo.ogImage">OG Image URL</Label>
            <Input id="seo.ogImage" name="seo.ogImage" type="url" defaultValue={seo.ogImage ?? ''} disabled={isPending} />
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="card-surface p-6 flex flex-col gap-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Analytics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="analytics.gaId">Google Analytics ID</Label>
            <Input id="analytics.gaId" name="analytics.gaId" defaultValue={analytics.gaId ?? ''} placeholder="G-XXXXXXXXXX" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="analytics.metaPixelId">Meta Pixel ID</Label>
            <Input id="analytics.metaPixelId" name="analytics.metaPixelId" defaultValue={analytics.metaPixelId ?? ''} placeholder="123456789" disabled={isPending} />
          </div>
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-fit">
        Save Changes
      </Button>
    </form>
  )
}
