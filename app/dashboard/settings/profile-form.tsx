'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function ProfileForm({ currentName, userId }: { currentName: string; userId: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fullName = fd.get('fullName') as string
    if (!fullName.trim()) return

    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-[13px] text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Name updated
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" defaultValue={currentName} required disabled={isPending} />
      </div>
      <Button type="submit" variant="primary" size="md" loading={isPending} className="w-fit">
        Save Name
      </Button>
    </form>
  )
}
