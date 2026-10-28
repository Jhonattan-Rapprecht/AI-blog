import { useEffect, useMemo, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Blocks, CheckCircle2, Code2, Copy, LayoutTemplate, Plus, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PrimaryButton } from '@/components/core'
import { previews, type ComponentPreview } from '@/lib/component-previews'
import { htmlToJsx } from '@/lib/html-to-jsx'
import { cn } from '@/lib/utils'
import { api, errorMessage } from '@/api/client'

type Tab = 'preview' | 'html' | 'css' | 'jsx'
type Workspace = 'snippets' | 'library'
type ComponentCategory = 'all' | 'article' | 'editorial' | 'layout'
type TrustedComponent = {
  id: string
  name: string
  category: Exclude<ComponentCategory, 'all'>
  description: string
  variants: string[]
  regions: string[]
  properties: string[]
  status: 'registered' | 'planned'
  preview: 'static'
}
const TABS: { id: Tab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'jsx', label: 'JSX' },
]
const canSaveSnippet = import.meta.env.DEV
// Theme tokens forwarded into the sandboxed frame so pasted CSS can use var(--primary) etc.
const TOKENS = ['--radius', '--background', '--foreground', '--card', '--card-foreground', '--primary',
  '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground', '--destructive', '--border', '--input', '--ring']

const toComponentName = (p: ComponentPreview) => p.name.replace(/\W+/g, '') || 'Component'

// Tracks the theme class on <html>, which is the single source of truth set by AppShell.
const subscribeTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
const getTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
const useDocumentTheme = () => useSyncExternalStore(subscribeTheme, getTheme)

function PreviewFrame({ preview, theme }: { preview: ComponentPreview; theme: string }) {
  const srcDoc = useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    const vars = TOKENS.map((t) => `${t}:${styles.getPropertyValue(t)}`).join(';')
    return `<!doctype html><html class="${theme}"><head><style>
      :root{${vars}} *{box-sizing:border-box}
      body{margin:0;padding:24px;font-family:Inter,system-ui,'Segoe UI',sans-serif;
        background:var(--card);color:var(--foreground)}
    </style><style>${preview.css}</style></head><body>${preview.html}</body></html>`
  }, [preview, theme])

  // Empty sandbox: isolated styles, no scripts.
  return <iframe title={preview.name} sandbox="" srcDoc={srcDoc} className="block h-[480px] w-full resize-y bg-card" />
}

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function NewComponentForm({ onSaved, onCancel }: { onSaved: (slug: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [saving, setSaving] = useState(false)
  const slug = toSlug(name)

  const save = async () => {
    if (!slug) return toast.error('Enter a name')
    if (!html.trim()) return toast.error('Paste some HTML')
    setSaving(true)
    try {
      const res = await fetch('/__component-previews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, html, css }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`)
      toast.success(`Saved ${data.slug}`)
      onSaved(data.slug)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="gap-3 p-4">
      <Input type="text" className="" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Component name, e.g. Pricing card" autoFocus />
      {name && <p className="-mt-1 text-xs text-muted-foreground">Saved as <code>{slug || 'â€¦'}.html</code></p>}
      <Textarea value={html} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHtml(e.target.value)} placeholder="Paste HTML" rows={8} className="font-mono text-xs" />
      <Textarea value={css} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCss(e.target.value)} placeholder="Paste CSS (optional)" rows={5} className="font-mono text-xs" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Savingâ€¦' : 'Save component'}</Button>
      </div>
    </Card>
  )
}

function SnippetsWorkspace() {
  const theme = useDocumentTheme()
  const [adding, setAdding] = useState(false)
  const [selected, setSlug] = useState(previews[0]?.slug)
  const [activeTab, setTab] = useState<Tab>('preview')
  // Fall back gracefully when a preview file is removed while selected (HMR).
  const current = previews.find((p) => p.slug === selected) ?? previews[0]
  const slug = current?.slug
  const tab: Tab = activeTab === 'css' && !current?.hasCss ? 'preview' : activeTab

  const jsx = useMemo(() => (current ? htmlToJsx(current.html, toComponentName(current)) : ''), [current])
  const source = { preview: current?.html, html: current?.html, css: current?.css, jsx }[tab] ?? ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      toast.success(`${tab === 'preview' ? 'HTML' : tab.toUpperCase()} copied`)
    } catch {
      toast.error('Could not access the clipboard')
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
      <div className="grid content-start gap-4">
        <div className="flex h-9 items-center justify-between">
          <h2 className="text-lg font-semibold">Components</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{previews.length} {previews.length === 1 ? 'file' : 'files'}</span>
            {canSaveSnippet && <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus /> New component</Button>}
          </div>
        </div>
        {adding && (
          <NewComponentForm
            onCancel={() => setAdding(false)}
            onSaved={(s) => { setSlug(s); setTab('preview'); setAdding(false) }}
          />
        )}
        {!canSaveSnippet && <p className="text-xs text-muted-foreground">Snippet authoring is available in the local development workspace. Published component registration remains a separate, reviewed workflow.</p>}
        <Card className="gap-0 overflow-hidden py-0">
          {previews.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Click <strong>New component</strong> to paste your first snippet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-2 font-medium">Component</th><th className="px-4 py-2 font-medium">Files</th></tr>
              </thead>
              <tbody>
                {previews.map((p) => (
                  <tr
                    key={p.slug}
                    onClick={() => setSlug(p.slug)}
                    className={cn('cursor-pointer border-b last:border-0 hover:bg-muted/40', p.slug === slug && 'bg-muted/60')}
                  >
                    <td className="px-4 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.slug}</div></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Badge variant="outline">HTML</Badge>
                        {p.hasCss && <Badge variant="outline">CSS</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {current && (
        <div className="grid min-w-0 content-start gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-lg font-semibold">{current.name}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copy}><Copy /> Copy</Button>
              <PrimaryButton icon={Code2} onClick={() => setTab('jsx')}>Convert to React</PrimaryButton>
            </div>
          </div>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={tab === t.id ? 'secondary' : 'ghost'}
                disabled={t.id === 'css' && !current.hasCss}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <Card className="gap-0 overflow-hidden py-0">
            {tab === 'preview'
              ? <PreviewFrame preview={current} theme={theme} />
              : <pre className="max-h-[480px] overflow-auto p-4 text-xs leading-relaxed"><code>{source}</code></pre>}
          </Card>
        </div>
      )}
    </div>
  )
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  all: 'All components',
  article: 'Article components',
  editorial: 'Editorial components',
  layout: 'Layout components',
}

function StaticReferencePreview({ component }: { component: TrustedComponent }) {
  const hasHero = component.regions.includes('hero')
  const hasBody = component.regions.includes('body') || component.regions.includes('wide-content')

  return (
    <div className="overflow-hidden rounded-md border bg-muted/30 p-3" aria-label={`Static reference preview for ${component.name}`}>
      <div className={cn('rounded-sm bg-muted/80', hasHero ? 'h-10' : 'h-3')} />
      <div className="mt-2 grid gap-1.5">
        <span className="h-2 w-3/4 rounded bg-foreground/25" />
        <span className="h-2 w-full rounded bg-foreground/15" />
        {hasBody && <span className="h-2 w-5/6 rounded bg-foreground/15" />}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Static reference preview — not live Astro rendering.</p>
    </div>
  )
}

function ComponentLibrary() {
  const [components, setComponents] = useState<TrustedComponent[]>([])
  const [category, setCategory] = useState<ComponentCategory>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.articleDesignCatalog()
      .then((catalog) => {
        if (!active) return
        setComponents(Array.isArray(catalog.components) ? catalog.components : [])
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return components.filter((component) => {
      const categoryMatches = category === 'all' || component.category === category
      const queryMatches = !normalized || [component.name, component.id, component.description, component.variants.join(' '), component.regions.join(' ')].join(' ').toLowerCase().includes(normalized)
      return categoryMatches && queryMatches
    })
  }, [category, components, query])

  if (loading) return <p className="text-sm text-muted-foreground">Loading approved component catalog…</p>
  if (error) return <p className="text-sm text-destructive">Could not load the approved component catalog: {error}</p>

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-lg font-semibold">Approved Astro components</h2><p className="mt-1 text-sm text-muted-foreground">Version-controlled metadata only. Registered components are trusted application code; planned entries are not executable.</p></div>
        <div className="relative w-full lg:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} className="pl-9" placeholder="Search components" aria-label="Search components" /></div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Component category filters">
        {(Object.keys(CATEGORY_LABELS) as ComponentCategory[]).map((id) => <Button key={id} size="sm" variant={category === id ? 'secondary' : 'outline'} onClick={() => setCategory(id)}>{CATEGORY_LABELS[id]}</Button>)}
      </div>
      {filtered.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">No approved component matches this filter.</Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((component) => <Card key={component.id} className="gap-4 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{component.name}</p><p className="mt-1 text-xs text-muted-foreground">{component.id}</p></div><Badge variant={component.status === 'registered' ? 'secondary' : 'outline'} className="shrink-0">{component.status === 'registered' ? <CheckCircle2 className="size-3" /> : null}{component.status}</Badge></div>
          <p className="min-h-10 text-sm text-muted-foreground">{component.description}</p>
          <StaticReferencePreview component={component} />
          <dl className="grid gap-2 text-xs"><div><dt className="font-medium">Variants</dt><dd className="mt-1 text-muted-foreground">{component.variants.length ? component.variants.join(', ') : 'None'}</dd></div><div><dt className="font-medium">Layout regions</dt><dd className="mt-1 text-muted-foreground">{component.regions.join(', ')}</dd></div><div><dt className="font-medium">Configurable properties</dt><dd className="mt-1 text-muted-foreground">{component.properties.length ? component.properties.join(', ') : 'None'}</dd></div></dl>
        </Card>)}
      </div>}
    </div>
  )
}

export default function ComponentsPage() {
  const [workspace, setWorkspace] = useState<Workspace>('library')
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-xl font-semibold"><Blocks className="size-5" /> Components</h1><p className="mt-1 text-sm text-muted-foreground">Browse the trusted editorial component registry or work with isolated HTML snippets.</p></div><div className="flex gap-2" role="tablist" aria-label="Components workspace"><Button role="tab" aria-selected={workspace === 'library'} variant={workspace === 'library' ? 'secondary' : 'outline'} onClick={() => setWorkspace('library')}><LayoutTemplate /> Component library</Button><Button role="tab" aria-selected={workspace === 'snippets'} variant={workspace === 'snippets' ? 'secondary' : 'outline'} onClick={() => setWorkspace('snippets')}><Code2 /> HTML snippets</Button></div></div>
      <div role="tabpanel">{workspace === 'library' ? <ComponentLibrary /> : <SnippetsWorkspace />}</div>
    </div>
  )
}
