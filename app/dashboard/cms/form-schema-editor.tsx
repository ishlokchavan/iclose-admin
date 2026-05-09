'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveFormSchema } from '@/lib/actions/cms'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import type { FormField } from '@/lib/cms-schemas'

const DEFAULT_FIELDS: FormField[] = [
  { id: '1', name: 'fullName', type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true, order: 0, isActive: true },
  { id: '2', name: 'phone', type: 'tel', label: 'Phone', placeholder: '+971 50 123 4567', required: true, order: 1, isActive: true },
  { id: '3', name: 'email', type: 'email', label: 'Email (optional)', placeholder: 'you@example.com', required: false, order: 2, isActive: true },
  { id: '4', name: 'isLicensedAgent', type: 'radio', label: 'Are you a real estate agent?', required: true, order: 3, isActive: true, options: [{ label: 'Yes, I am', value: 'true' }, { label: 'No / Connector', value: 'false' }] },
  { id: '5', name: 'dealVolume', type: 'select', label: 'Monthly deal volume', required: true, order: 4, isActive: true, options: [{ label: '0-1 / month', value: '0-1' }, { label: '1-3 / month', value: '1-3' }, { label: '3-5 / month', value: '3-5' }, { label: '5-10 / month', value: '5-10' }, { label: '10+ / month', value: '10+' }] },
]

export default function FormSchemaEditor({ schema }: { schema: Record<string, unknown> | null }) {
  const existingFields = schema?.fields_json as FormField[] ?? DEFAULT_FIELDS
  const [fields, setFields] = useState<FormField[]>(existingFields)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function addField() {
    setFields(prev => [...prev, {
      id: crypto.randomUUID(), name: '', type: 'text' as const,
      label: '', required: false, order: prev.length, isActive: true,
    }])
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  function handleSave() {
    const withOrder = fields.map((f, i) => ({ ...f, order: i }))
    startTransition(async () => {
      await saveFormSchema('agent-registration', withOrder)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] text-graphite">{fields.length} fields · Version {(schema?.version as number ?? 0) + 1}</p>
          <p className="text-[12px] text-graphite-light mt-0.5">Changes create a new version. The active version is served to the public site.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="flex items-center gap-1 text-[13px] text-green-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
          <Button variant="secondary" size="sm" onClick={addField} type="button"><Plus className="h-4 w-4" /> Add Field</Button>
          <Button variant="primary" size="sm" loading={isPending} onClick={handleSave} type="button">Publish</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="card-surface p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-graphite-light">#{idx + 1}</span>
              <div className="flex-1" />
              <label className="flex items-center gap-1.5 text-[12px] text-graphite cursor-pointer">
                <input type="checkbox" checked={field.isActive} onChange={(e) => updateField(field.id, { isActive: e.target.checked })} />
                Active
              </label>
              <button type="button" onClick={() => removeField(field.id)} className="text-graphite-light hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px]">Field Name</Label>
                <Input value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })}
                  placeholder="fieldName" className="h-9 font-mono text-[12px]" disabled={isPending} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px]">Label</Label>
                <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Display label" className="h-9 text-[12px]" disabled={isPending} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px]">Type</Label>
                <select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'] })}
                  className="h-9 rounded-xl border border-hairline px-3 text-[12px] bg-paper" disabled={isPending}>
                  {['text','email','tel','select','radio','checkbox','textarea'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input value={field.placeholder ?? ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                placeholder="Placeholder text…" className="h-9 text-[12px]" disabled={isPending} />
              <label className="flex items-center gap-1.5 text-[12px] text-graphite cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                Required
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
