import { useEffect, useState } from 'react'
import { Check, LayoutTemplate, Loader2, Save, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ArticleLayoutsPage() {
  const [catalog, setCatalog] = useState(null)
  const [publication, setPublication] = useState(null)
  const [selectedLayout, setSelectedLayout] = useState('classic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.articleDesignCatalog(), api.articleDesignPublication()])
      .then(([nextCatalog, nextPublication]) => { setCatalog(nextCatalog); setPublication(nextPublication); setSelectedLayout(nextPublication.selection.layout) })
      .catch((reason) => setError(errorMessage(reason)))
  }, [])

  const save = async () => {
    setSaving(true)
    try { const next = await api.updateArticleDesignPublication({ layout: selectedLayout }); setPublication(next); toast.success('Publication default layout saved') }
    catch (reason) { toast.error(errorMessage(reason)) }
    finally { setSaving(false) }
  }

  if (error) return <div className="mx-auto max-w-5xl"><h2 className="text-lg font-semibold">Article Layouts</h2><p className="mt-2 text-sm text-destructive">Could not load the design catalog: {error}</p></div>
  if (!catalog) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading layout foundation…</div>

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Article Layouts</h2><p className="mt-1 text-sm text-muted-foreground">Choose the publication default. Individual articles can override it from the Editor.</p></div><Button onClick={save} disabled={saving || selectedLayout === publication?.selection?.layout}><Save className="size-4" /> {saving ? 'Saving…' : 'Save default'}</Button></div>
      <div className="grid gap-4 md:grid-cols-3">
        {catalog.layouts.map((layout) => <Card key={layout.id} className={`gap-4 py-5 transition-colors ${selectedLayout === layout.id ? 'border-primary ring-1 ring-primary/30' : ''}`}>
          <CardHeader className="px-5"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><LayoutTemplate className="size-4" /> {layout.name}</CardTitle>{layout.id === publication?.selection?.layout && <Badge>Current default</Badge>}</div><CardDescription>{layout.description}</CardDescription></CardHeader>
          <CardContent className="space-y-4 px-5"><p className="text-xs font-medium text-muted-foreground">Supported regions</p><div className="flex flex-wrap gap-1.5">{layout.regions.map((region) => <Badge variant="outline" key={region}>{region.replace('-', ' ')}</Badge>)}</div><Button type="button" variant={selectedLayout === layout.id ? 'default' : 'outline'} className="w-full" onClick={() => setSelectedLayout(layout.id)}>{selectedLayout === layout.id ? <><Check className="size-4" /> Selected</> : 'Choose layout'}</Button></CardContent>
        </Card>)}
      </div>
      <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Safe layout selection</CardTitle><CardDescription>Only the three approved layouts can be saved. Existing articles continue to use Classic Editorial until you select a different publication default or article override.</CardDescription></CardHeader><CardContent className="px-5"><p className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-500" /> Layout selection never changes article content, styles, or Developer → Components snippets.</p></CardContent></Card>
    </div>
  )
}
