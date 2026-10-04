import { useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Code2, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PrimaryButton } from '@/components/core'
import { previews, type ComponentPreview } from '@/lib/component-previews'
import { htmlToJsx } from '@/lib/html-to-jsx'
import { cn } from '@/lib/utils'

type Tab = 'preview' | 'html' | 'css' | 'jsx'
const TABS: { id: Tab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'jsx', label: 'JSX' },
]
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

export default function ComponentsPage() {
  const theme = useDocumentTheme()
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
          <span className="text-xs text-muted-foreground">{previews.length} {previews.length === 1 ? 'file' : 'files'}</span>
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          {previews.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Add an <code>.html</code> file to <code>src/component-previews/</code>.
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
