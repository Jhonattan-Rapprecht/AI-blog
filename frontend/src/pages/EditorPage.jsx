import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'
import { api, errorMessage, socket } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', featured_image: '', status: 'draft', category_id: '',
  seo_title: '', seo_description: '', seo_keywords: '',
}
const FIELDS = Object.keys(EMPTY)
const STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived']
const TONES = ['Professional', 'Conversational', 'Technical', 'Opinionated']
const DEFAULT_AUDIENCES = ['General', 'Technical', 'Business', 'Beginners', 'Experts']

const payload = (a) => ({ ...a, category_id: a.category_id || null })
const pick = (src) => Object.fromEntries(FIELDS.map((k) => [k, src?.[k] ?? EMPTY[k]]))

function Field({ label, children, hint }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint}
    </div>
  )
}

function Suggestions({ items, onPick }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge key={s} variant="secondary" className="cursor-pointer font-normal" onClick={() => onPick(s)}>
          {s}
        </Badge>
      ))}
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [articleId, setArticleId] = useState(id || null)
  const [article, setArticle] = useState(EMPTY)
  const [ai, setAi] = useState({
    topic: '', targetAudience: 'General', language: 'English', tone: 'Professional',
    articleLength: 'Medium', category: '', keywords: '', additionalInstructions: '',
  })
  const [categories, setCategories] = useState([])
  const [audiences, setAudiences] = useState(DEFAULT_AUDIENCES)
  const [topics, setTopics] = useState([])
  const [slugs, setSlugs] = useState([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newCategory, setNewCategory] = useState(null)
  const [newAudience, setNewAudience] = useState(null)
  const generatingRef = useRef(false)

  const set = (name) => (e) => setArticle((a) => ({ ...a, [name]: e.target.value }))
  const setAI = (name) => (e) => setAi((a) => ({ ...a, [name]: e.target.value }))

  const loadCategories = useCallback(
    () => api.categories().then(setCategories).catch((e) => toast.error(errorMessage(e))),
    [],
  )

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    setArticleId(id || null)
    if (!id) { setArticle(EMPTY); return }
    api.article(id).then((a) => setArticle(pick(a))).catch((e) => toast.error(errorMessage(e)))
  }, [id])

  // Releases the Generate button even when the socket event never arrives
  useEffect(() => {
    const done = () => { generatingRef.current = false; setGenerating(false) }
    socket.on('ai:generation:failed', done)
    return () => socket.off('ai:generation:failed', done)
  }, [])

  const save = async () => {
    if (!article.title || !article.slug || !article.content) {
      return toast.error('Title, slug and content are required')
    }
    setSaving(true)
    try {
      if (articleId) {
        await api.updateArticle(articleId, payload(article))
        toast.success('Article updated')
      } else {
        const { id: newId } = await api.createArticle(payload(article))
        setArticleId(newId)
        navigate(`/articles/${newId}`, { replace: true })
        toast.success('Article saved')
      }
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const generate = async () => {
    if (!ai.topic) return toast.error('Enter a topic first')
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)
    try {
      const res = await api.generate(ai)
      setArticle(pick(res.article))
      setArticleId(res.articleId)
      navigate(`/articles/${res.articleId}`, { replace: true })
      toast.success('Article generated and saved for review')
    } catch (e) {
      toast.error(`Generation failed: ${errorMessage(e)}`)
    } finally {
      generatingRef.current = false
      setGenerating(false)
    }
  }

  const suggestTopics = async () => {
    try {
      const list = await api.suggestTopics()
      setTopics(list)
      if (!list.length) toast.info('No new topics found, try again')
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const suggestSlugs = async () => {
    if (!article.title) return toast.error('Enter a title first')
    try { setSlugs(await api.suggestSlugs(article.title)) } catch (e) { toast.error(errorMessage(e)) }
  }

  const addCategory = async () => {
    if (!newCategory?.trim()) return
    try {
      await api.addCategory(newCategory.trim())
      await loadCategories()
      setNewCategory(null)
    } catch (e) { toast.error(`Could not add category: ${errorMessage(e)}`) }
  }

  const deleteCategory = async () => {
    const cat = categories.find((c) => String(c.id) === String(article.category_id))
    if (!cat || !window.confirm(`Delete category "${cat.name}"?`)) return
    try {
      await api.deleteCategory(cat.id)
      setArticle((a) => ({ ...a, category_id: '' }))
      await loadCategories()
    } catch (e) { toast.error(`Could not delete category: ${errorMessage(e)}`) }
  }

  const addAudience = () => {
    const v = newAudience?.trim()
    if (v && !audiences.includes(v)) setAudiences((a) => [...a, v])
    if (v) setAi((a) => ({ ...a, targetAudience: v }))
    setNewAudience(null)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid min-w-0 content-start gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{articleId ? 'Edit article' : 'New article'}</h2>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} {articleId ? 'Save changes' : 'Save draft'}
          </Button>
        </div>
        <Input value={article.title} onChange={set('title')} placeholder="Article title" className="h-11 text-base" />
        <div className="editor-quill">
          <ReactQuill theme="snow" value={article.content} onChange={(content) => setArticle((a) => ({ ...a, content }))} />
        </div>
      </div>

      <div className="grid content-start gap-4">
        <Card className="gap-4 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">Publishing</CardTitle></CardHeader>
          <CardContent className="grid gap-3 px-4">
            <Field label="Status">
              <NativeSelect value={article.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Category">
              <div className="flex gap-1.5">
                <NativeSelect value={article.category_id ?? ''} onChange={set('category_id')}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
                <Button variant="outline" size="icon" onClick={() => setNewCategory('')} title="Add category"><Plus /></Button>
                <Button variant="outline" size="icon" onClick={deleteCategory} disabled={!article.category_id} title="Delete selected category"><Trash2 /></Button>
              </div>
              {newCategory !== null && (
                <div className="flex gap-1.5">
                  <Input autoFocus value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="New category" />
                  <Button variant="outline" size="icon" onClick={addCategory}><Save /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setNewCategory(null)}><X /></Button>
                </div>
              )}
            </Field>
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader className="px-4"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="size-4" /> AI generation</CardTitle></CardHeader>
          <CardContent className="grid gap-3 px-4">
            <Field label="Topic" hint={<Suggestions items={topics} onPick={(t) => setAi((a) => ({ ...a, topic: t }))} />}>
              <div className="flex gap-1.5">
                <Input value={ai.topic} onChange={setAI('topic')} placeholder="e.g. Future of AI in dev" />
                <Button variant="outline" size="icon" onClick={suggestTopics} title="Suggest topics"><Sparkles /></Button>
              </div>
            </Field>
            <Field label="Audience">
              <div className="flex gap-1.5">
                <NativeSelect value={ai.targetAudience} onChange={setAI('targetAudience')}>
                  {audiences.map((a) => <option key={a}>{a}</option>)}
                </NativeSelect>
                <Button variant="outline" size="icon" onClick={() => setNewAudience('')} title="Add audience"><Plus /></Button>
              </div>
              {newAudience !== null && (
                <div className="flex gap-1.5">
                  <Input autoFocus value={newAudience} onChange={(e) => setNewAudience(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAudience()} placeholder="New audience" />
                  <Button variant="outline" size="icon" onClick={addAudience}><Save /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setNewAudience(null)}><X /></Button>
                </div>
              )}
            </Field>
            <Field label="Tone">
              <NativeSelect value={ai.tone} onChange={setAI('tone')}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </NativeSelect>
            </Field>
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" /> : <Sparkles />} {generating ? 'Generating...' : 'Generate article'}
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">SEO &amp; metadata</CardTitle></CardHeader>
          <CardContent className="grid gap-3 px-4">
            <Field label="Slug" hint={<Suggestions items={slugs} onPick={(s) => setArticle((a) => ({ ...a, slug: s }))} />}>
              <div className="flex gap-1.5">
                <Input value={article.slug} onChange={set('slug')} placeholder="article-slug" />
                <Button variant="outline" size="icon" onClick={suggestSlugs} title="Suggest slugs"><Sparkles /></Button>
              </div>
            </Field>
            <Field label="Excerpt"><Textarea rows={3} value={article.excerpt ?? ''} onChange={set('excerpt')} /></Field>
            <Field label="SEO title"><Input value={article.seo_title ?? ''} onChange={set('seo_title')} /></Field>
            <Field label="SEO description"><Textarea rows={3} value={article.seo_description ?? ''} onChange={set('seo_description')} /></Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

