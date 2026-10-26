import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Eye, FileText, Loader2, Timer } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'

const CHART_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#22d3ee', '#a3a3a3']

const formatCount = (value) => Number(value || 0).toLocaleString()
const formatDuration = (seconds) => {
  const value = Number(seconds || 0)
  if (!value) return '—'
  if (value < 60) return `${value}s`
  return `${Math.floor(value / 60)}m ${String(value % 60).padStart(2, '0')}s`
}

function MetricCard({ title, value, detail, icon: Icon }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex items-center justify-between px-4">
        <CardDescription>{title}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CategoryDonut({ categories }) {
  const total = categories.reduce((sum, category) => sum + category.article_count, 0)
  if (!total) return <p className="text-sm text-muted-foreground">No published articles to categorize yet.</p>

  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 42 42" role="img" aria-label="Published articles by category" className="size-40 shrink-0 -rotate-90">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--border)" strokeWidth="5" />
        {categories.map((category, index) => {
          const portion = (category.article_count / total) * 100
          const circle = <circle key={category.name} cx="21" cy="21" r="15.915" fill="none" stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth="5" strokeDasharray={`${portion} ${100 - portion}`} strokeDashoffset={-offset} />
          offset += portion
          return circle
        })}
        <text x="21" y="22" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[5px]" transform="rotate(90 21 21)">{total}</text>
      </svg>
      <ul className="grid min-w-40 flex-1 gap-2">
        {categories.map((category, index) => (
          <li key={category.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate">{category.name}</span></span>
            <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">{category.article_count} · {formatCount(category.views)} views</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PublishingChart({ months }) {
  const max = Math.max(1, ...months.map((month) => month.article_count))
  return (
    <div className="grid h-52 grid-cols-6 items-end gap-3 border-b px-1">
      {months.map((month) => (
        <div key={month.month} className="flex h-full flex-col items-center justify-end gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">{month.article_count || ''}</span>
          <div className="flex h-36 w-full items-end">
            <div className="w-full rounded-t bg-primary transition-[height] duration-500" style={{ height: `${month.article_count ? Math.max(8, (month.article_count / max) * 100) : 2}%` }} title={`${month.article_count} published`} />
          </div>
          <span className="pb-2 text-xs text-muted-foreground">{month.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function ArticlesAnalyticsPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState('30')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.articleAnalytics(days)
      .then((result) => { if (active) setData(result) })
      .catch((error) => { if (active) toast.error(errorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [days])

  const statusSummary = useMemo(() => data?.statuses || [], [data])
  const summary = data?.summary

  return (
    <div className="mx-auto grid max-w-7xl content-start gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Articles Analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Publishing activity, content mix, and measured reader engagement.</p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="analytics-period" className="flex items-center gap-1.5 text-xs text-muted-foreground">Reader metrics period{loading && data && <Loader2 className="size-3 animate-spin" />}</label>
          <NativeSelect id="analytics-period" value={days} onChange={(event) => setDays(event.target.value)} className="h-8 min-w-36">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </NativeSelect>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div>
      ) : data && summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="All articles" value={formatCount(summary.total_articles)} detail={`${formatCount(summary.uncategorized)} uncategorized`} icon={FileText} />
            <MetricCard title="Published" value={formatCount(summary.published_articles)} detail="Live on the public blog" icon={BookOpen} />
            <MetricCard title={`Views · ${days} days`} value={formatCount(summary.views)} detail={`${formatCount(summary.engaged_views)} engaged reads (10+ seconds)`} icon={Eye} />
            <MetricCard title="Average active read" value={formatDuration(summary.average_read_seconds)} detail="Visible time on article pages in the selected period" icon={Timer} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="gap-4 py-4">
              <CardHeader className="px-4"><CardTitle className="text-sm">Publishing activity</CardTitle><CardDescription>Articles published per month · last 6 months</CardDescription></CardHeader>
              <CardContent className="px-4"><PublishingChart months={data.publishing_trend} /></CardContent>
            </Card>
            <Card className="gap-4 py-4">
              <CardHeader className="px-4"><CardTitle className="text-sm">Published content by category</CardTitle><CardDescription>Article count and reader views in the selected period.</CardDescription></CardHeader>
              <CardContent className="px-4"><CategoryDonut categories={data.categories} /></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card className="gap-4 py-4">
              <CardHeader className="px-4"><CardTitle className="text-sm">Most-read articles</CardTitle><CardDescription>Based on tracked article page views over the last {days} days.</CardDescription></CardHeader>
              <CardContent className="px-4">
                {data.top_articles.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                      <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="w-[70%] py-2 font-medium">Article</th><th className="w-[14%] px-3 py-2 text-right font-medium">Views</th><th className="w-[16%] py-2 text-right font-medium">Avg. read</th></tr></thead>
                      <tbody>{data.top_articles.map((article) => <tr key={article.id} className="border-b last:border-0"><td className="max-w-0 py-3"><button type="button" title={article.title} onClick={() => navigate(`/articles/${article.id}`)} className="block w-full truncate whitespace-nowrap text-left font-medium hover:underline">{article.title}</button></td><td className="px-3 py-3 text-right tabular-nums">{formatCount(article.views)}</td><td className="py-3 text-right text-muted-foreground">{formatDuration(article.average_read_seconds)}</td></tr>)}</tbody>
                    </table>
                  </div>
                ) : <p className="rounded-md border p-5 text-sm text-muted-foreground">No reader activity has been recorded in this period yet. New visits will appear here.</p>}
              </CardContent>
            </Card>

            <Card className="gap-4 py-4">
              <CardHeader className="px-4"><CardTitle className="text-sm">Generation topics and SEO keywords</CardTitle><CardDescription>Topics from saved AI-generation prompts, plus article SEO keywords.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 px-4">
                <div>
                  <h3 className="mb-2 text-xs font-medium text-muted-foreground">AI GENERATION TOPICS</h3>
                  {data.top_topics.length ? <div className="flex flex-wrap gap-2">{data.top_topics.map((item) => <Badge key={item.topic} variant="secondary" title={`${item.article_count} article(s)`}>{item.topic} <span className="ml-1 opacity-60">{item.article_count}</span></Badge>)}</div> : <p className="text-sm text-muted-foreground">No published AI-generated topics yet.</p>}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-medium text-muted-foreground">SEO KEYWORDS</h3>
                  {data.top_keywords.length ? <div className="flex flex-wrap gap-2">{data.top_keywords.map((item) => <Badge key={item.keyword} variant="outline" title={`${item.article_count} article(s)`}>{item.keyword} <span className="ml-1 opacity-60">{item.article_count}</span></Badge>)}</div> : <p className="text-sm text-muted-foreground">No SEO keywords have been saved.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Timer className="size-4 shrink-0" />
            <span>Estimated reading time averages {summary.average_estimated_read_minutes} min per published article, based on article length. Measured reader data starts collecting with new visits after this update; no historical views or read time are available.</span>
            <Link to="/articles" className="ml-auto text-foreground underline-offset-4 hover:underline">Open article overview</Link>
          </div>
          {statusSummary.length > 0 && <div className="flex flex-wrap gap-2">{statusSummary.map((item) => <Badge key={item.status} variant="outline" className="capitalize">{item.status}: {formatCount(item.article_count)}</Badge>)}</div>}
        </>
      ) : (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">Analytics are unavailable right now. Refresh the page or check the server connection.</div>
      )}
    </div>
  )
}
