import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'
import { api, errorMessage, socket } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', featured_image: '', status: 'draft', category_id: '',
  seo_title: '', seo_description: '', seo_keywords: '',
}
const FIELDS = Object.keys(EMPTY)
const STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived']

// Quill 2 serializes spaces as &nbsp;, which breaks line wrapping on the public site.
const payload = (a) => ({ ...a, content: (a.content || '').replace(/&nbsp;/g, ' '), category_id: a.category_id || null })
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
    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 overflow-hidden">
      {items.map((s) => (
        <Button key={s} type="button" variant="secondary" size="xs" title={s} className="h-auto min-w-0 max-w-full truncate rounded-full font-normal active:scale-[0.96]" onClick={() => onPick(s)}>
          <span className="block truncate">{s}</span>
        </Button>
      ))}
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [articleId, setArticleId] = useState(id || null)
  const [article, setArticle] = useState(EMPTY)
  const [ai, setAi] = useState({ topic: '', targetAudience: 'General', language: 'English', tone: 'Professional', articleLength: 'Medium', category: '', keywords: '', additionalInstructions: '' })
  const [categories, setCategories] = useState([])
  const [writingSettings, setWritingSettings] = useState(null)
  const [topics, setTopics] = useState([])
  const [slugs, setSlugs] = useState([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [suggestingTopics, setSuggestingTopics] = useState(false)
  const [suggestingSlugs, setSuggestingSlugs] = useState(false)
  const [newCategory, setNewCategory] = useState(null)
  const [newAudience, setNewAudience] = useState(null)
  const generatingRef = useRef(false)
  const selectedCategory = categories.find((category) => String(category.id) === String(article.category_id))

  const set = (name) => (e) => setArticle((a) => ({ ...a, [name]: e.target.value }))
  const setAI = (name) => (e) => setAi((a) => ({ ...a, [name]: e.target.value }))
  const setCategory = (e) => {
    setArticle((current) => ({ ...current, category_id: e.target.value }))
    setTopics([])
  }

  const loadCategories = useCallback(
    () => api.categories().then(setCategories).catch((e) => toast.error(errorMessage(e))),
    [],
  )

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    api.settings().then((settings) => {
      setWritingSettings(settings)
      setAi((current) => ({ ...current, targetAudience: settings.audience, language: settings.language, tone: settings.tone, articleLength: settings.articleLength }))
    }).catch(() => {})
  }, [])

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
      const result = await api.generate(ai)
      navigate('/articles', { state: { highlightArticleId: result.articleId } })
      toast.success('Article generated and saved for review')
    } catch (e) {
      toast.error(`Generation failed: ${errorMessage(e)}`)
    } finally {
      generatingRef.current = false
      setGenerating(false)
    }
  }

  const suggestTopics = async () => {
    setSuggestingTopics(true)
    try {
      const list = await api.suggestTopics({ category: selectedCategory?.name || '', topic: ai.topic })
      setTopics(list)
      if (!list.length) toast.info('The AI model returned no topics. Try again.')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSuggestingTopics(false) }
  }

  const suggestSlugs = async () => {
    if (!article.title) return toast.error('Enter a title first')
    setSuggestingSlugs(true)
    try { setSlugs(await api.suggestSlugs(article.title)) } catch (e) { toast.error(errorMessage(e)) }
    finally { setSuggestingSlugs(false) }
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
    if (v) {
      api.saveSettings({ audience: v }).then((settings) => {
        setWritingSettings(settings)
        setAi((a) => ({ ...a, targetAudience: settings.audience }))
        toast.success('Default audience saved in Settings')
      }).catch((e) => toast.error(errorMessage(e)))
    }
    setNewAudience(null)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid min-w-0 content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/articles')}><ArrowLeft /> Articles overview</Button>
            <h2 className="text-lg font-semibold">{articleId ? 'Edit article' : 'New article'}</h2>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} {articleId ? 'Save changes' : 'Save draft'}
          </Button>
        </div>
        <Input value={article.title} onChange={set('title')} placeholder="Article title" className="h-11 text-base" />
        <div className="editor-quill">
          <ReactQuill theme="snow" value={article.content} onChange={(content) => setArticle((a) => ({ ...a, content }))} />
        </div>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <Card className="gap-4 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">Publishing</CardTitle></CardHeader>
          <CardContent className="grid min-w-0 gap-3 overflow-hidden px-4">
            <Field label="Status">
              <NativeSelect value={article.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Category">
              <div className="flex gap-1.5">
                <NativeSelect value={article.category_id ?? ''} onChange={setCategory}>
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
            <Field label="Topic" hint={<>
              <p className="text-xs text-muted-foreground">{selectedCategory ? `Suggestions based on ${selectedCategory.name}.` : 'Choose a category to focus suggestions, or leave it empty for varied topics.'}</p>
              <Suggestions items={topics} onPick={(t) => setAi((a) => ({ ...a, topic: t }))} />
            </>}>
              <div className="flex gap-1.5">
                <Input value={ai.topic} onChange={setAI('topic')} placeholder="e.g. Future of AI in dev" />
                <Button variant="outline" size="icon" onClick={suggestTopics} disabled={suggestingTopics} title="Suggest topics" aria-label="Suggest topics">
                  {suggestingTopics ? <Loader2 className="animate-spin" /> : <Sparkles />}
                </Button>
              </div>
            </Field>
            <Field label="Language">
              <NativeSelect value={ai.language} onChange={setAI('language')}>
                {Array.from(new Set([writingSettings?.language || ai.language, 'English', 'Dutch', 'Spanish', 'French', 'German'])).map((language) => <option key={language}>{language}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Audience">
              <div className="flex gap-1.5">
                <NativeSelect value={ai.targetAudience} onChange={setAI('targetAudience')}>
                  {Array.from(new Set([writingSettings?.audience || ai.targetAudience, 'General', 'Technical', 'Business', 'Beginners', 'Experts'])).map((a) => <option key={a}>{a}</option>)}
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
                {Array.from(new Set([writingSettings?.tone || ai.tone, 'Professional', 'Conversational', 'Technical', 'Opinionated'])).map((t) => <option key={t}>{t}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Article length">
              <NativeSelect value={ai.articleLength} onChange={setAI('articleLength')}>
                {Array.from(new Set([writingSettings?.articleLength || ai.articleLength, 'Short', 'Medium', 'Long'])).map((length) => <option key={length}>{length}</option>)}
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
                <Button variant="outline" size="icon" onClick={suggestSlugs} disabled={suggestingSlugs} title="Suggest slugs" aria-label="Suggest slugs">
                  {suggestingSlugs ? <Loader2 className="animate-spin" /> : <Sparkles />}
                </Button>
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

