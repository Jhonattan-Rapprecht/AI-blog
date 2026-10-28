import { useEffect, useState } from 'react'
import { Loader2, Palette, Type } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function StyleAppearancePage() {
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.articleDesignCatalog().then(setCatalog).catch((reason) => setError(errorMessage(reason))) }, [])
  if (error) return <div className="mx-auto max-w-5xl"><h2 className="text-lg font-semibold">Style & Appearance</h2><p className="mt-2 text-sm text-destructive">Could not load the design catalog: {error}</p></div>
  if (!catalog) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading style foundation…</div>

  return <div className="mx-auto grid max-w-5xl gap-6">
    <div><h2 className="text-lg font-semibold">Style & Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Define the visual language of published articles independently from their layout.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{catalog.stylePresets.map((preset) => <Card key={preset.id} className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4" /> {preset.name}</CardTitle><CardDescription>{preset.description}</CardDescription></CardHeader><CardContent className="px-5">{preset.id === catalog.defaultDesign.stylePreset && <Badge>Default</Badge>}</CardContent></Card>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><Type className="size-4" /> Approved typography tokens</CardTitle><CardDescription>Phase 1 limits the future system to approved font identifiers, scales, spacing, and line-height values—never arbitrary CSS or font URLs.</CardDescription></CardHeader><CardContent className="px-5"><div className="flex flex-wrap gap-1.5"><Badge variant="outline">Newsreader</Badge><Badge variant="outline">Inter</Badge><Badge variant="outline">Drop caps</Badge></div></CardContent></Card><Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Next: saved appearance</CardTitle><CardDescription>Phase 4 will add validated publication defaults and per-article overrides. No public article styling is changed in this phase.</CardDescription></CardHeader></Card></div>
  </div>
}
