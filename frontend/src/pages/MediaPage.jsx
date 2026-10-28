import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Images, Link2, Loader2, Play, Save, Trash2, Upload, Video } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, mediaUrl } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export default function MediaPage() {
  const [section, setSection] = useState('image')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingCredit, setSavingCredit] = useState(null)
  const [savingLink, setSavingLink] = useState(false)
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [failedVideos, setFailedVideos] = useState({})
  const [confirmItem, setConfirmItem] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const input = useRef(null)

  const load = useCallback((type) => api.media(type).then(setItems).catch((e) => toast.error(errorMessage(e))).finally(() => setLoading(false)), [])
  useEffect(() => {
    setLoading(true)
    load(section)
  }, [load, section])

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (section === 'image') {
      if (!IMAGE_TYPES.includes(file.type)) return toast.error('Choose a JPG, PNG, WebP, or GIF image.')
      if (file.size > 12 * 1024 * 1024) return toast.error('Images must be 12 MB or smaller.')
    } else {
      if (!VIDEO_TYPES.includes(file.type)) return toast.error('Choose an MP4, WebM, or MOV video.')
      if (file.size > 200 * 1024 * 1024) return toast.error('Videos must be 200 MB or smaller.')
    }
    setUploading(true)
    try {
      const item = await api.uploadMedia(file)
      setItems((current) => [item, ...current])
      toast.success(`${section === 'image' ? 'Image' : 'Video'} added to Media Library`)
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setUploading(false) }
  }

  const addVideoLink = async (event) => {
    event.preventDefault()
    if (!linkUrl.trim()) return toast.error('Enter a video URL.')
    setSavingLink(true)
    try {
      const item = await api.addVideoLink({ title: linkTitle, url: linkUrl, thumbnailUrl })
      setItems((current) => [item, ...current])
      setLinkTitle('')
      setLinkUrl('')
      setThumbnailUrl('')
      setLinkFormOpen(false)
      toast.success('Video link added to Media Library')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSavingLink(false) }
  }

  const remove = async () => {
    if (!confirmItem || deleting) return
    const item = confirmItem
    setDeleting(true)
    try {
      await api.deleteMedia(item.id)
      setItems((current) => current.filter((media) => media.id !== item.id))
      toast.success(`${item.media_type === 'video' ? 'Video' : 'Image'} deleted`)
      setConfirmItem(null)
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setDeleting(false) }
  }

  const setCredit = (id, credit) => setItems((current) => current.map((item) => item.id === id ? { ...item, credit } : item))
  const saveCredit = async (item) => {
    setSavingCredit(item.id)
    try {
      const updated = await api.updateMedia(item.id, { credit: item.credit || '' })
      setItems((current) => current.map((media) => media.id === item.id ? updated : media))
      toast.success('Photo credit/source saved')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSavingCredit(null) }
  }

  const selectSection = (next) => {
    setSection(next)
    setLinkFormOpen(false)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Media Library</h2><p className="mt-1 text-sm text-muted-foreground">Manage reusable images and videos for your articles. Files are stored locally with Blogstudio.</p></div>
        <input ref={input} type="file" accept={section === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'video/mp4,video/webm,video/quicktime'} className="hidden" onChange={upload} />
        <div className="flex flex-wrap gap-2">
          {section === 'video' && <Button type="button" variant="outline" onClick={() => setLinkFormOpen((current) => !current)}><Link2 /> Add video link</Button>}
          <Button onClick={() => input.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload {section}</Button>
        </div>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border bg-muted/30 p-1" role="tablist" aria-label="Media type">
        <button type="button" role="tab" aria-selected={section === 'image'} onClick={() => selectSection('image')} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${section === 'image' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Images className="size-4" /> Images</button>
        <button type="button" role="tab" aria-selected={section === 'video'} onClick={() => selectSection('video')} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${section === 'video' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Video className="size-4" /> Videos</button>
      </div>

      {section === 'video' && linkFormOpen && <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><h3 className="text-sm font-medium">Add a hosted video link</h3><p className="mt-1 text-xs text-muted-foreground">Use an HTTPS video page URL. A thumbnail is optional.</p></div>
        <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com/video" aria-label="Video URL" className="sm:col-span-2" />
        <Input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Video title (optional)" aria-label="Video title" />
        <Input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="Thumbnail URL (optional)" aria-label="Thumbnail URL" />
        <div className="flex gap-2 sm:col-span-2"><Button type="button" onClick={addVideoLink} disabled={savingLink}>{savingLink ? <Loader2 className="animate-spin" /> : <Link2 />} Save video link</Button><Button type="button" variant="outline" onClick={() => setLinkFormOpen(false)}>Cancel</Button></div>
      </CardContent></Card>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div> : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => <Card key={item.id} className="overflow-hidden gap-0 py-0">
            {section === 'image'
              ? <img src={mediaUrl(item.filepath)} alt={item.filename} className="aspect-[16/10] w-full bg-muted object-cover" loading="lazy" />
              : item.source_type === 'link'
                ? item.thumbnail_url
                  ? <div className="relative"><img src={item.thumbnail_url} alt={item.filename} className="aspect-[16/10] w-full bg-muted object-cover" loading="lazy" /><span className="absolute inset-0 grid place-items-center bg-black/15"><Play className="size-10 fill-white text-white drop-shadow" /></span></div>
                  : <div className="grid aspect-[16/10] place-items-center gap-2 bg-muted text-muted-foreground"><Play className="size-10" /><span className="text-xs">{item.provider || 'Hosted video'}</span></div>
                : failedVideos[item.id]
                  ? <div className="grid aspect-[16/10] place-items-center bg-muted px-5 text-center text-sm text-muted-foreground"><div><Video className="mx-auto mb-2 size-8" /><p className="font-medium text-foreground">Video could not be played</p><p className="mt-1">The file may be incomplete or use a codec this browser does not support. Try MP4 with H.264 video or WebM.</p></div></div>
                  : <video src={mediaUrl(item.filepath)} controls preload="metadata" playsInline className="aspect-[16/10] w-full bg-black object-contain" onError={() => setFailedVideos((current) => ({ ...current, [item.id]: true }))} />}
            <CardContent className="grid gap-2 p-3">
              <div className="flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium" title={item.filename}>{item.filename}</p><p className="text-xs text-muted-foreground">{item.source_type === 'link' ? 'Video link' : `Uploaded � ${(item.file_size / 1024 / 1024).toFixed(1)} MB`}</p></div><Button variant="ghost" size="icon-sm" onClick={() => setConfirmItem(item)} title={`Delete ${section}`}><Trash2 className="text-muted-foreground" /></Button></div>
              {section === 'image' && <>
                <label className="grid gap-1 text-xs text-muted-foreground">Photo credit/source<Input className="placeholder:text-[10px] placeholder:text-muted-foreground/45" value={item.credit || ''} onChange={(event) => setCredit(item.id, event.target.value)} placeholder="e.g. Shutterstock, Getty Images, Unsplash" maxLength={500} /></label>
                <Button variant="outline" size="sm" onClick={() => saveCredit(item)} disabled={savingCredit === item.id}>{savingCredit === item.id ? <Loader2 className="animate-spin" /> : <Save />} Save credit</Button>
              </>}
              {section === 'video' && item.source_type === 'link' && <a href={item.source_url} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline" title={item.source_url}>Open video link</a>}
            </CardContent>
          </Card>)}
        </div>
      ) : section === 'image' ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"><ImagePlus className="size-8 text-muted-foreground" /><p className="font-medium">Your image library is empty</p><p className="text-sm text-muted-foreground">Upload an image here or add one while editing an article.</p><Button variant="outline" onClick={() => input.current?.click()}><Upload /> Upload image</Button></div>
      ) : (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"><Video className="size-8 text-muted-foreground" /><p className="font-medium">Your video library is empty</p><p className="text-sm text-muted-foreground">Upload a video file or add a link to a hosted video.</p><div className="flex gap-2"><Button variant="outline" onClick={() => input.current?.click()}><Upload /> Upload video</Button><Button variant="outline" onClick={() => setLinkFormOpen(true)}><Link2 /> Add video link</Button></div></div>
      )}

      {confirmItem && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setConfirmItem(null) }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="media-delete-title" aria-describedby="media-delete-description" className="grid w-full max-w-md gap-5 rounded-xl border bg-background p-5 text-foreground shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="size-5" /></div>
            <div className="grid min-w-0 gap-1.5">
              <h2 id="media-delete-title" className="font-semibold">Delete {confirmItem.media_type === 'video' ? 'video' : 'image'}?</h2>
              <p id="media-delete-description" className="text-sm text-muted-foreground">This will remove <span className="font-medium text-foreground">{confirmItem.filename}</span> from your Media Library{confirmItem.source_type === 'upload' ? ' and delete its uploaded file' : ''}. This action cannot be undone.</p>
              <p className="text-xs text-muted-foreground">Media currently used in an article cannot be deleted.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmItem(null)} disabled={deleting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={deleting}>{deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete {confirmItem.media_type === 'video' ? 'video' : 'image'}</Button>
          </div>
        </section>
      </div>}
    </div>
  )
}
