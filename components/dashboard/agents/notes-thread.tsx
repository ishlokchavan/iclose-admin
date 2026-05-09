'use client'

import { useTransition, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addAgentNote } from '@/lib/actions/agents'
import { formatDateTime } from '@/lib/utils'


type NoteWithAuthor = {
  id: string
  body: string
  created_at: string
  createdAt?: string
  author: { id: string; full_name?: string; fullName?: string; role: string } | null
}

export function NotesThread({
  agentId,
  notes,
}: {
  agentId: string
  notes: NoteWithAuthor[]
}) {
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('agentId', agentId)
    startTransition(async () => {
      await addAgentNote(formData)
      formRef.current?.reset()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Note list */}
      <div className="flex flex-col gap-3">
        {notes.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-graphite">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/90 text-[11px] font-semibold text-white">
                {(note.author as any)?.full_name ?? (note.author as any)?.fullName?.charAt(0)}
              </div>
              <div className="flex-1 rounded-xl bg-mist px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-ink">{(note.author as any)?.full_name ?? (note.author as any)?.fullName}</span>
                  <span className="text-[11px] text-graphite-light">{formatDateTime(note.created_at ?? note.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/80">{note.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          name="body"
          placeholder="Add an internal note…"
          rows={2}
          required
          disabled={isPending}
          className="input-base flex-1 resize-none py-3 text-[13px]"
        />
        <Button type="submit" variant="dark" size="sm" loading={isPending} className="self-end">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  )
}
