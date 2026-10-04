import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
  const [articles, setArticles] = useState(null)

  useEffect(() => {
    api.articles().then(setArticles).catch((e) => { toast.error(errorMessage(e)); setArticles([]) })
  }, [])

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
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-2 font-medium">Title</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Created</th><th className="w-12" /></tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/articles/${a.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3"><div className="font-medium">{a.title}</div><div className="text-xs text-muted-foreground">/{a.slug}</div></td>
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
