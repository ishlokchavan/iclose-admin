'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Copy, CheckCircle2, Image } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteMediaFile } from '@/lib/actions/cms'

type MediaFile = {
  id: string
  storage_path: string
  mime: string
  alt: string | null
  created_at: string
  width?: number
  height?: number
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function loadFiles() {
    setLoading(true)
    const { data } = await supabase.from('cms_media' as never).select('*').order('created_at', { ascending: false }).limit(50)
    setFiles((data as MediaFile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `cms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('cms-media').upload(path, file, { cacheControl: '31536000' })
      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('cms-media').getPublicUrl(path)

      // Insert into cms_media via service (this runs client-side so we use anon key — fine for inserts with RLS)
      await supabase.from('cms_media' as never).insert({
        storage_path: path, mime: file.type, alt: file.name.replace(/\.[^.]+$/, ''),
      } as never)

      await loadFiles()
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function getPublicUrl(path: string) {
    const { data: { publicUrl } } = supabase.storage.from('cms-media').getPublicUrl(path)
    return publicUrl
  }

  function copyUrl(path: string) {
    navigator.clipboard.writeText(getPublicUrl(path))
    setCopied(path)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleDelete(id: string, path: string) {
    startTransition(async () => {
      await deleteMediaFile(id, path)
      setFiles(prev => prev.filter(f => f.id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-graphite">{files.length} files</p>
        <div>
          <input ref={inputRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleUpload} />
          <Button variant="primary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload File
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square rounded-xl bg-mist animate-pulse" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="card-mist flex flex-col items-center gap-3 rounded-xl py-16 text-center">
          <Image className="h-8 w-8 text-graphite-light" />
          <p className="text-[14px] text-graphite">No media files yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => {
            const url = getPublicUrl(file.storage_path)
            const isImage = file.mime.startsWith('image/')
            return (
              <div key={file.id} className="group relative rounded-xl overflow-hidden border border-hairline bg-mist aspect-square">
                {isImage ? (
                  <img src={url} alt={file.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-mono text-[11px] text-graphite">{file.mime.split('/')[1]}</span>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyUrl(file.storage_path)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper/20 text-white hover:bg-paper/40 transition-colors">
                    {copied === file.storage_path ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(file.id, file.storage_path)} disabled={isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper/20 text-white hover:bg-red-500/80 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* Alt text */}
                <div className="absolute bottom-0 left-0 right-0 bg-ink/80 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-[10px] text-white/80">{file.alt ?? file.storage_path.split('/').pop()}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
