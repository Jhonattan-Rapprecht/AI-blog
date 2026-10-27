import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, BookOpen, ChevronDown, CircleHelp, Download, Eye, FileSpreadsheet, FileText, Filter, Loader2, RefreshCw, ScrollText, Settings, Video, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const PAGE_SIZE = 50
const REPORTS = [
  ['all', 'All activity'], ['content', 'Articles and content'], ['publishing', 'Publishing and scheduling'],
  ['media', 'Media Library'], ['authentication', 'Administrator access'], ['ai', 'AI and model status'],
  ['settings', 'Settings changes'], ['automation', 'Automation'], ['errors', 'Errors and rejected actions'],
  ['system', 'System events'], ['analytics', 'Analytics'],
]

function dateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function initialFilters() {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - 30)
  return { category: 'all', from: dateInputValue(from), to: dateInputValue(today) }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(date) + ' UTC'
}

function severityVariant(severity) {
  if (severity === 'error' || severity === 'critical') return 'destructive'
  if (severity === 'warning') return 'secondary'
  return 'outline'
}

function outcomeLabel(outcome) {
  return ({ success: 'Success', rejected: 'Rejected', failure: 'Failed', observed: 'Observed' })[outcome] || outcome || '—'
}

export default function ActivityLogsPage() {
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [offset, setOffset] = useState(0)
  const [report, setReport] = useState({ events: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const requestSequence = useRef(0)
  const exportMenu = useRef(null)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    setLoading(true)
    try {
      const result = await api.activityReports({ ...filters, limit: PAGE_SIZE, offset })
      if (sequence === requestSequence.current) setReport(result)
    } catch (error) {
      if (sequence === requestSequence.current) toast.error(errorMessage(error))
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [filters, offset])

  useEffect(() => { load() }, [load])

  const applyFilters = (event) => {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      toast.error('The start date must be on or before the end date.')
      return
    }
    setOffset(0)
    setFilters({ ...draft })
  }

  const exportReport = async (format) => {
    if (exportMenu.current) exportMenu.current.open = false
    setExporting(format)
    try {
      const file = await api.exportActivityReport(filters, format)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `blogstudio-${filters.category || 'all'}-${filters.from}-to-${filters.to}.${format}`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      const data = error.response?.data
      let message = errorMessage(error)
      if (data instanceof Blob) {
        try { message = JSON.parse(await data.text()).error || message } catch { /* Keep the request error message. */ }
      }
      toast.error(message)
    } finally {
      setExporting('')
    }
  }

  const currentStart = report.total ? offset + 1 : 0
  const currentEnd = Math.min(offset + report.events.length, report.total)
  const overviewCards = [
    ['all', 'All activity', Activity], ['content', 'Articles and content', BookOpen], ['publishing', 'Publishing', ScrollText],
    ['media', 'Media Library', Video], ['authentication', 'Administrator access', ScrollText], ['ai', 'AI activity', WandSparkles],
    ['settings', 'Settings changes', Settings], ['automation', 'Automation', RefreshCw],
    ['errors', 'Errors and rejected', AlertTriangle], ['system', 'System events', Settings], ['analytics', 'Reader activity', Eye],
  ]

  const chooseReport = (category) => {
    setDraft((current) => ({ ...current, category }))
    setOffset(0)
    setFilters((current) => ({ ...current, category }))
  }

  return (
    <div className="mx-auto grid max-w-7xl content-start gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">System Activity Logs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Browse administrator actions, publishing, media, AI, automation, and system errors.</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild><button type="button" aria-label="About report export formats" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="size-4" /></button></TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs leading-relaxed">
                Export the selected report and date range as an Excel workbook (.xlsx), CSV (.csv), or a formatted PDF summary. Excel and CSV can also be imported into Google Sheets; direct Google Sheets publishing is not connected.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <details ref={exportMenu} className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export report <ChevronDown className="size-4 text-muted-foreground" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-1 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
              <button type="button" onClick={() => exportReport('xlsx')} disabled={Boolean(exporting) || !report.total} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"><FileSpreadsheet className="size-4 text-emerald-500" /><span><span className="block font-medium">Excel workbook</span><span className="text-xs text-muted-foreground">.xlsx with report and overview</span></span></button>
              <button type="button" onClick={() => exportReport('csv')} disabled={Boolean(exporting) || !report.total} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"><FileText className="size-4 text-sky-500" /><span><span className="block font-medium">CSV data</span><span className="text-xs text-muted-foreground">.csv for spreadsheets</span></span></button>
              <button type="button" onClick={() => exportReport('pdf')} disabled={Boolean(exporting) || !report.total} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"><FileText className="size-4 text-rose-500" /><span><span className="block font-medium">PDF report</span><span className="text-xs text-muted-foreground">Overview and filtered activity</span></span></button>
            </div>
          </details>
        </div>
      </div>

      <Card className="gap-4 py-4">
        <CardContent className="px-4">
          <form onSubmit={applyFilters} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto_auto]">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Report type
              <NativeSelect value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                {REPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">From
              <Input type="date" value={draft.from} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">To
              <Input type="date" value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} />
            </label>
            <Button type="submit" disabled={loading}><Filter /> Apply filters</Button>
            <Button type="button" variant="outline" onClick={load} disabled={loading} aria-label="Refresh report"><RefreshCw className={loading ? 'animate-spin' : ''} /></Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Times are shown in UTC. Reports include events recorded after activity logging was enabled; older activity cannot be reconstructed.</p>
        </CardContent>
      </Card>

      <section aria-label="Activity report overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {overviewCards.map(([category, label, Icon]) => <button key={category} type="button" onClick={() => chooseReport(category)} aria-pressed={filters.category === category} className={`grid gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filters.category === category ? 'border-primary ring-1 ring-primary/40' : ''}`}>
          <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span><Icon className="size-4 shrink-0" /></span>
          <span className="text-xl font-semibold tabular-nums">{loading && !report.overview ? '—' : Number(category === 'all' ? report.overview?.total || 0 : report.overview?.counts?.[category] || 0).toLocaleString()}</span>
          <span className="text-[11px] text-muted-foreground">in selected dates</span>
        </button>)}
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2"><ScrollText className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Activity report</h3></div>
          <span className="text-xs tabular-nums text-muted-foreground">{loading ? 'Loading…' : `${report.total.toLocaleString()} events`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
              <th className="w-48 px-4 py-3 font-medium">Date and time</th>
              <th className="w-[30%] px-4 py-3 font-medium">Activity</th>
              <th className="w-40 px-4 py-3 font-medium">Actor</th>
              <th className="w-48 px-4 py-3 font-medium">Target</th>
              <th className="w-32 px-4 py-3 font-medium">Result</th>
            </tr></thead>
            <tbody>
              {report.events.map((event) => {
                const details = typeof event.details === 'string' ? (() => { try { return JSON.parse(event.details) } catch { return {} } })() : event.details || {}
                return <tr key={event.id} className="border-t align-top hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(event.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{event.action}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><Badge variant="outline" className="capitalize">{event.category}</Badge><span>{event.event_type}</span></div>
                    {(event.path || event.source) && <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{event.method ? `${event.method} ` : ''}{event.path || event.source}{event.status_code ? ` · HTTP ${event.status_code}` : ''}</div>}
                    {Object.keys(details).length > 0 && <details className="mt-1 text-xs text-muted-foreground"><summary className="w-fit cursor-pointer">Details</summary><pre className="mt-1 max-w-md whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(details, null, 2)}</pre></details>}
                  </td>
                  <td className="px-4 py-3"><div className="truncate" title={event.actor || event.actor_type}>{event.actor || '—'}</div><div className="mt-1 text-xs capitalize text-muted-foreground">{event.actor_type} · {event.source}</div></td>
                  <td className="px-4 py-3"><div className="break-words">{event.target_label || event.target_type || '—'}</div>{event.target_id && <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{event.target_id}</div>}</td>
                  <td className="px-4 py-3"><div className="grid justify-items-start gap-1"><Badge variant={severityVariant(event.severity)} className="capitalize">{event.severity}</Badge><span className="text-xs text-muted-foreground">{outcomeLabel(event.outcome)}</span></div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        {!loading && report.events.length === 0 && <div className="grid justify-items-center gap-2 border-t px-6 py-14 text-center"><ScrollText className="size-8 text-muted-foreground" /><p className="font-medium">No events found for this report</p><p className="max-w-lg text-sm text-muted-foreground">Try another report type or a wider date range. Activity logging starts when this version is running; past actions are not backfilled.</p></div>}
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">{loading ? ' ' : `Showing ${currentStart}–${currentEnd} of ${report.total.toLocaleString()}`}</span>
          <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={loading || offset === 0}>Previous</Button><Button type="button" variant="outline" size="sm" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={loading || offset + PAGE_SIZE >= report.total}>Next</Button></div>
        </div>
      </Card>
    </div>
  )
}
