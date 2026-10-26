import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, mediaUrl } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function MediaPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingCredit, setSavingCredit] = useState(null)
  const input = useRef(null)

  const load = useCallback(() => api.media().then(setItems).catch((e) => toast.error(errorMessage(e))).finally(() => setLoading(false)), [])
  useEffect(() => { load() }, [load])

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return toast.error('Choose a JPG, PNG, WebP, or GIF image.')
    if (file.size > 12 * 1024 * 1024) return toast.error('Images must be 12 MB or smaller.')
    setUploading(true)
    try { const item = await api.uploadMedia(file); setItems((current) => [item, ...current]); toast.success('Image added to Media Library') }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setUploading(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.filename}?`)) return
    try { await api.deleteMedia(item.id); setItems((current) => current.filter((media) => media.id !== item.id)); toast.success('Image deleted') }
    catch (e) { toast.error(errorMessage(e)) }
  }

  const setCredit = (id, credit) => setItems((current) => current.map((item) => item.id === id ? { ...item, credit } : item))
  const saveCredit = async (item) => {
    setSavingCredit(item.id)
    try { const updated = await api.updateMedia(item.id, { credit: item.credit || '' }); setItems((current) => current.map((media) => media.id === item.id ? updated : media)); toast.success('Photo credit/source saved') }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setSavingCredit(null) }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Media Library</h2><p className="mt-1 text-sm text-muted-foreground">Upload images to reuse as article featured images. Files are stored locally with Blogstudio.</p></div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={upload} />
        <Button onClick={() => input.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload image</Button>
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div> : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => <Card key={item.id} className="overflow-hidden gap-0 py-0">
            <img src={mediaUrl(item.filepath)} alt={item.filename} className="aspect-[16/10] w-full bg-muted object-cover" loading="lazy" />
            <CardContent className="grid gap-2 p-3">
              <div className="flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium" title={item.filename}>{item.filename}</p><p className="text-xs text-muted-foreground">Uploaded · {(item.file_size / 1024 / 1024).toFixed(1)} MB</p></div><Button variant="ghost" size="icon-sm" onClick={() => remove(item)} title="Delete image"><Trash2 className="text-muted-foreground" /></Button></div>
              <label className="grid gap-1 text-xs text-muted-foreground">Photo credit/source<Input value={item.credit || ''} onChange={(event) => setCredit(item.id, event.target.value)} placeholder="e.g. Michael Henniway" maxLength={500} /></label>
              <Button variant="outline" size="sm" onClick={() => saveCredit(item)} disabled={savingCredit === item.id}>{savingCredit === item.id ? <Loader2 className="animate-spin" /> : <Save />} Save credit</Button>
            </CardContent>
          </Card>)}
        </div>
      ) : <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"><ImagePlus className="size-8 text-muted-foreground" /><p className="font-medium">Your media library is empty</p><p className="text-sm text-muted-foreground">Upload an image here or add one while editing an article.</p><Button variant="outline" onClick={() => input.current?.click()}><Upload /> Upload image</Button></div>}
    </div>
  )
}
