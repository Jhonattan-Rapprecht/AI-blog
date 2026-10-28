import { useEffect, useState } from 'react'
import { Check, LayoutTemplate, Loader2, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ArticleLayoutsPage() {
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.articleDesignCatalog().then(setCatalog).catch((reason) => setError(errorMessage(reason)))
  }, [])

  if (error) return <div className="mx-auto max-w-5xl"><h2 className="text-lg font-semibold">Article Layouts</h2><p className="mt-2 text-sm text-destructive">Could not load the design catalog: {error}</p></div>
  if (!catalog) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading layout foundation…</div>

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div><h2 className="text-lg font-semibold">Article Layouts</h2><p className="mt-1 text-sm text-muted-foreground">Choose how published articles are structurally composed. Layouts stay separate from visual style.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        {catalog.layouts.map((layout) => <Card key={layout.id} className="gap-4 py-5">
          <CardHeader className="px-5"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><LayoutTemplate className="size-4" /> {layout.name}</CardTitle>{layout.id === catalog.defaultDesign.layout && <Badge>Default</Badge>}</div><CardDescription>{layout.description}</CardDescription></CardHeader>
          <CardContent className="px-5"><p className="text-xs font-medium text-muted-foreground">Supported regions</p><div className="mt-2 flex flex-wrap gap-1.5">{layout.regions.map((region) => <Badge variant="outline" key={region}>{region.replace('-', ' ')}</Badge>)}</div></CardContent>
        </Card>)}
      </div>
      <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Safe layout foundation</CardTitle><CardDescription>Phase 1 publishes the approved catalog only. It does not alter article content, render a different public layout, or save design choices.</CardDescription></CardHeader><CardContent className="px-5"><p className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-500" /> Current and legacy articles will use the safe Classic Editorial default when Phase 2 selection is introduced.</p></CardContent></Card>
    </div>
  )
}
