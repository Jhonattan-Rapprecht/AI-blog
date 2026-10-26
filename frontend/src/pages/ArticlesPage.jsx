import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const tone = {
  published: 'default', review: 'secondary', scheduled: 'secondary', draft: 'outline', archived: 'outline',
}

export default function ArticlesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [articles, setArticles] = useState(null)
  const [highlightedId, setHighlightedId] = useState(() => location.state?.highlightArticleId || null)
  const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' })

  const sortedArticles = useMemo(() => {
    if (!articles) return []
    return [...articles].sort((a, b) => {
      let comparison
      if (sort.key === 'created_at') {
        comparison = (new Date(a.created_at || 0).getTime() || 0) - (new Date(b.created_at || 0).getTime() || 0)
      } else {
        comparison = String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), undefined, { numeric: true, sensitivity: 'base' })
      }
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [articles, sort])

  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }))

  const sortIcon = (key) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3 opacity-50" />
    return sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
  }

  useEffect(() => {
    api.articles().then(setArticles).catch((e) => { toast.error(errorMessage(e)); setArticles([]) })
  }, [])

  useEffect(() => {
    if (!articles || !highlightedId) return
    const row = document.getElementById(`article-${highlightedId}`)
    if (!row) return
    row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => setHighlightedId(null), 8000)
    return () => window.clearTimeout(timer)
  }, [articles, highlightedId])

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return
    try {
      await api.deleteArticle(a.id)
      setArticles((list) => list.filter((x) => x.id !== a.id))
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Articles</h2>
        <Button asChild><Link to="/"><Plus /> New article</Link></Button>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        {articles === null && <div className="grid gap-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>}
        {articles?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No articles yet. Create or generate your first one.</p>}
        {articles?.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
              <tr>
                <th aria-sort={sort.key === 'title' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('title')} className="inline-flex items-center gap-1.5">Title {sortIcon('title')}</button></th>
                <th aria-sort={sort.key === 'status' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1.5">Status {sortIcon('status')}</button></th>
                <th aria-sort={sort.key === 'created_at' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1.5">Created {sortIcon('created_at')}</button></th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sortedArticles.map((a) => (
                <tr id={`article-${a.id}`} key={a.id} onClick={() => navigate(`/articles/${a.id}`)} className={`cursor-pointer border-b last:border-0 transition-colors duration-300 hover:bg-muted/40 ${highlightedId === a.id ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''}`}>
                  <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-2 font-medium">{a.title}{highlightedId === a.id && <Badge variant="secondary">Just created</Badge>}</div><div className="text-xs text-muted-foreground">/{a.slug}</div></td>
                  <td className="px-4 py-3"><Badge variant={tone[a.status] || 'outline'} className="capitalize">{a.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</td>
                  <td className="px-2"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a) }} title="Delete"><Trash2 /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
