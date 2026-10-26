import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/native-select'

const tone = {
  published: 'default', review: 'secondary', scheduled: 'secondary', draft: 'outline', archived: 'outline',
}
const STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived']
const STATUS_ORDER = new Map(STATUSES.map((status, index) => [status, index]))
const PAGE_SIZE = 24

function ArticleStatus({ article, onSave }) {
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)
  const isPublished = article.status === 'published'

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const revealEdit = () => {
    if (isPublished || editing) return
    window.clearTimeout(timer.current)
    setShowEdit(true)
    timer.current = window.setTimeout(() => setShowEdit(false), 1600)
  }

  const hideEdit = () => {
    window.clearTimeout(timer.current)
    if (!editing) setShowEdit(false)
  }

  const chooseStatus = async (event) => {
    const status = event.target.value
    if (status === article.status) {
      setEditing(false)
      return
    }
    setSaving(true)
    const saved = await onSave(article, status)
    setSaving(false)
    if (saved) setEditing(false)
  }

  if (isPublished) return <Badge variant={tone.published} className="capitalize">{article.status}</Badge>

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
        <NativeSelect autoFocus aria-label={`Change status for ${article.title}`} value={article.status} onChange={chooseStatus} onBlur={() => !saving && setEditing(false)} disabled={saving} className="h-7 w-auto min-w-28 px-2 py-1 text-xs capitalize">
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </NativeSelect>
        {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </span>
    )
  }

  return (
    <span role="group" tabIndex={0} aria-label={`Status: ${article.status}. Focus or hover to edit.`} className="relative inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onMouseEnter={revealEdit} onMouseLeave={hideEdit} onFocus={revealEdit} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) hideEdit() }} onClick={(event) => event.stopPropagation()}>
      <Badge variant={tone[article.status] || 'outline'} className={`capitalize transition-all duration-200 ${showEdit ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>{article.status}</Badge>
      <Button type="button" variant="secondary" size="xs" tabIndex={showEdit ? 0 : -1} aria-label={`Edit ${article.status} status`} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${showEdit ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'}`} onClick={() => { setEditing(true); setShowEdit(false) }}>
        <Pencil /> Edit
      </Button>
    </span>
  )
}

function ArticleCategory({ article, categories, onSave }) {
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)
  const uncategorized = !article.category_id && !article.category_name

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const revealEdit = () => {
    if (!uncategorized || !categories.length || editing) return
    window.clearTimeout(timer.current)
    setShowEdit(true)
    timer.current = window.setTimeout(() => setShowEdit(false), 1600)
  }

  const hideEdit = () => {
    window.clearTimeout(timer.current)
    if (!editing) setShowEdit(false)
  }

  const chooseCategory = async (event) => {
    const category = categories.find((item) => String(item.id) === event.target.value)
    if (!category) return
    setSaving(true)
    const saved = await onSave(article, category)
    setSaving(false)
    if (saved) setEditing(false)
  }

  if (!uncategorized) return <Badge variant="outline">{article.category_name}</Badge>

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
        <NativeSelect autoFocus aria-label={`Assign a category to ${article.title}`} value="" onChange={chooseCategory} onBlur={() => !saving && setEditing(false)} disabled={saving || !categories.length} className="h-7 w-auto min-w-32 px-2 py-1 text-xs">
          <option value="" disabled>Select category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </NativeSelect>
        {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </span>
    )
  }

  return (
    <span role="group" tabIndex={categories.length ? 0 : undefined} aria-label="Uncategorized. Focus or hover to assign a category." className="relative inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onMouseEnter={revealEdit} onMouseLeave={hideEdit} onFocus={revealEdit} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) hideEdit() }} onClick={(event) => event.stopPropagation()}>
      <Badge variant="outline" className={`transition-all duration-200 ${showEdit ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>Uncategorized</Badge>
      {categories.length > 0 && <Button type="button" variant="secondary" size="xs" tabIndex={showEdit ? 0 : -1} aria-label="Assign category" className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${showEdit ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'}`} onClick={() => { setEditing(true); setShowEdit(false) }}>
        <Pencil /> Edit
      </Button>}
    </span>
  )
}

export default function ArticlesPage() {
  const location = useLocation()
  const [articles, setArticles] = useState(null)
  const [categories, setCategories] = useState([])
  const [highlightedId, setHighlightedId] = useState(() => location.state?.highlightArticleId || null)
  const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' })
  const [view, setView] = useState(() => localStorage.getItem('articles-view') || 'table')
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const requestVersion = useRef(0)
  const appendLock = useRef(false)

  const loadPage = useCallback(async ({ append = false, offset = 0, sortValue = sort } = {}) => {
    if (append && appendLock.current) return
    if (append) {
      appendLock.current = true
      setLoadingMore(true)
    } else {
      requestVersion.current += 1
      appendLock.current = false
      setLoading(true)
      setLoadingMore(false)
      setArticles(null)
      setHasMore(true)
    }
    const version = requestVersion.current
    try {
      const page = await api.articles({ limit: PAGE_SIZE, offset, sortBy: sortValue.key, direction: sortValue.direction })
      if (version !== requestVersion.current) return
      setArticles((current) => append ? [...(current || []), ...page] : page)
      setHasMore(page.length === PAGE_SIZE)
    } catch (e) {
      if (version !== requestVersion.current) return
      toast.error(errorMessage(e))
      if (!append) setArticles([])
      setHasMore(false)
    } finally {
      if (version === requestVersion.current) {
        if (append) { appendLock.current = false; setLoadingMore(false) }
        else setLoading(false)
      }
    }
  }, [sort])

  useEffect(() => { loadPage({ sortValue: sort }) }, [loadPage, sort])
  useEffect(() => { api.categories().then(setCategories).catch((e) => toast.error(errorMessage(e))) }, [])
  useEffect(() => { localStorage.setItem('articles-view', view) }, [view])
  useEffect(() => {
    if (!hasMore || loading || loadingMore || articles === null || !sentinelRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadPage({ append: true, offset: articles.length, sortValue: sort })
    }, { rootMargin: '240px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, articles, loadPage, sort])

  const sortedArticles = useMemo(() => {
    if (!articles) return []
    return [...articles].sort((a, b) => {
      let comparison
      if (sort.key === 'created_at') {
        comparison = (new Date(a.created_at || 0).getTime() || 0) - (new Date(b.created_at || 0).getTime() || 0)
      } else if (sort.key === 'status') {
        comparison = (STATUS_ORDER.get(a.status) ?? STATUSES.length) - (STATUS_ORDER.get(b.status) ?? STATUSES.length)
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

  const updateStatus = async (article, status) => {
    try {
      await api.updateArticle(article.id, { status })
      setArticles((list) => list.map((item) => item.id === article.id ? { ...item, status } : item))
      toast.success(`Status changed to ${status}`)
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  const updateCategory = async (article, category) => {
    try {
      await api.updateArticle(article.id, { category_id: category.id })
      setArticles((list) => list.map((item) => item.id === article.id
        ? { ...item, category_id: category.id, category_name: category.name }
        : item))
      toast.success(`Category set to ${category.name}`)
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Articles Overview</h2>
        <Button asChild><Link to="/"><Plus /> New article</Link></Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1" role="group" aria-label="Articles layout">
          <Button type="button" size="sm" variant="ghost" className={`px-3 py-1.5 text-xs ${view === 'table' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent'}`} aria-pressed={view === 'table'} onClick={() => setView('table')}><List /> Table</Button>
          <Button type="button" size="sm" variant="ghost" className={`px-3 py-1.5 text-xs ${view === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent'}`} aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid /> Grid</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === 'grid' && <>
            <NativeSelect aria-label="Sort articles by" value={sort.key} onChange={(event) => setSort((current) => ({ ...current, key: event.target.value }))} className="w-auto">
              <option value="created_at">Date created</option><option value="title">Title</option><option value="status">Status</option><option value="category_name">Category</option>
            </NativeSelect>
            <Button type="button" variant="outline" size="icon" onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))} title={`${sort.direction === 'asc' ? 'Ascending' : 'Descending'} order; click to reverse`} aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}>{sort.direction === 'asc' ? <ArrowUp /> : <ArrowDown />}</Button>
          </>}
        </div>
      </div>
      {articles === null && <Card className="grid gap-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></Card>}
      {articles?.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No articles yet. Create or generate your first one.</Card>}
      {view === 'table' && articles?.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
              <tr>
                <th aria-sort={sort.key === 'title' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('title')} className="inline-flex items-center gap-1.5">Title {sortIcon('title')}</button></th>
                <th aria-sort={sort.key === 'status' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1.5">Status {sortIcon('status')}</button></th>
                <th aria-sort={sort.key === 'category_name' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('category_name')} className="inline-flex items-center gap-1.5">Category {sortIcon('category_name')}</button></th>
                <th aria-sort={sort.key === 'created_at' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2 font-medium"><button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1.5">Created {sortIcon('created_at')}</button></th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sortedArticles.map((a) => (
                <tr id={`article-${a.id}`} key={a.id} className={`border-b last:border-0 transition-colors duration-300 hover:bg-muted/40 ${highlightedId === a.id ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''}`}>
                  <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-2 font-medium"><Link to={`/articles/${a.id}`} className="hover:underline">{a.title}</Link>{highlightedId === a.id && <Badge variant="secondary">Just created</Badge>}</div><div className="text-xs text-muted-foreground">/{a.slug}</div></td>
                  <td className="px-4 py-3"><ArticleStatus article={a} onSave={updateStatus} /></td>
                  <td className="px-4 py-3"><ArticleCategory article={a} categories={categories} onSave={updateCategory} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</td>
                  <td className="px-2"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a) }} title="Delete"><Trash2 /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {view === 'grid' && articles?.length > 0 && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sortedArticles.map((article) => <Card id={`article-${article.id}`} key={article.id} className={`min-w-0 gap-4 p-4 transition-colors duration-300 ${highlightedId === article.id ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/articles/${article.id}`} className="line-clamp-2 font-semibold leading-snug hover:underline">{article.title}</Link>
              <div className="mt-1 truncate text-xs text-muted-foreground">/{article.slug}</div>
            </div>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" onClick={() => remove(article)} title="Delete article" aria-label={`Delete ${article.title}`}><Trash2 /></Button>
          </div>
          {highlightedId === article.id && <Badge variant="secondary" className="w-fit">Just created</Badge>}
          <div className="flex flex-wrap items-center gap-2">
            <ArticleStatus article={article} onSave={updateStatus} />
            <ArticleCategory article={article} categories={categories} onSave={updateCategory} />
          </div>
          <p className="mt-auto text-xs text-muted-foreground">Created {article.created_at ? new Date(article.created_at).toLocaleDateString() : '—'}</p>
        </Card>)}
      </div>}
      {articles?.length > 0 && <div ref={sentinelRef} className="flex min-h-12 items-center justify-center py-2 text-sm text-muted-foreground">
        {loadingMore ? <><Loader2 className="mr-2 size-4 animate-spin" /> Loading articles…</>
          : hasMore ? <span>Scroll to load more</span> : <span>All {articles.length} articles loaded</span>}
      </div>}
    </div>
  )
}
