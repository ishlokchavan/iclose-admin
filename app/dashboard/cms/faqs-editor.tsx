'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveFaqs } from '@/lib/actions/cms'
import { Plus, Trash2, GripVertical, CheckCircle2 } from 'lucide-react'
import type { FaqItem } from '@/lib/cms-schemas'

export default function FaqsEditor({ faqs: initial }: { faqs: FaqItem[] }) {
  const [faqs, setFaqs] = useState<FaqItem[]>(initial.length ? initial : [])
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function addFaq() {
    setFaqs(prev => [...prev, {
      id: crypto.randomUUID(),
      question: '',
      answer: '',
      order: prev.length,
    }])
  }

  function updateFaq(id: string, field: keyof FaqItem, value: string) {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  function removeFaq(id: string) {
    setFaqs(prev => prev.filter(f => f.id !== id))
  }

  function handleSave() {
    const withOrder = faqs.map((f, i) => ({ ...f, order: i }))
    startTransition(async () => {
      await saveFaqs(withOrder)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-graphite">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[13px] text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={addFaq} type="button">
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
          <Button variant="primary" size="sm" loading={isPending} onClick={handleSave} type="button">
            Save All
          </Button>
        </div>
      </div>

      {faqs.length === 0 && (
        <div className="card-mist rounded-xl p-8 text-center text-[14px] text-graphite">
          No FAQs yet. Click "Add FAQ" to create one.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {faqs.map((faq, idx) => (
          <div key={faq.id} className="card-surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-2">
              <GripVertical className="h-4 w-4 text-graphite-light shrink-0" />
              <span className="text-[12px] font-mono text-graphite-light">#{idx + 1}</span>
              <div className="flex-1" />
              <button type="button" onClick={() => removeFaq(faq.id)}
                className="text-graphite-light hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-1.5">
                <Label>Question</Label>
                <Input value={faq.question} onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                  placeholder="What is iClose?" disabled={isPending} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Answer</Label>
                <textarea value={faq.answer} onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                  placeholder="iClose is..." rows={3} disabled={isPending}
                  className="input-base resize-none py-3 text-[13px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
