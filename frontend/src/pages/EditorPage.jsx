import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Check, ImagePlus, Images, Loader2, Plus, Save, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { api, errorMessage, mediaUrl, socket } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', featured_image: '', featured_media_id: null, featured_media_path: '', featured_image_credit: '', status: 'draft', category_id: '',
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

function normalizeReviewText(value) {
  return String(value || '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

function normalizeReviewTitle(value) {
  return normalizeReviewText(value).replace(/[“”‘’"']/g, '').replace(/[.,!?;:]+$/g, '').trim()
}

function replaceTitleWord(title, quote, replacement) {
  const escapedQuote = String(quote || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escapedQuote || !String(quote).trim() || /\s/.test(String(quote).trim())) return null
  const match = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapedQuote})(?=$|[^\\p{L}\\p{N}_])`, 'iu').exec(title)
  if (!match) return null
  const start = match.index + match[1].length
  return `${title.slice(0, start)}${replacement}${title.slice(start + match[2].length)}`
}

function findWordMatch(text, quote) {
  const escapedQuote = String(quote || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escapedQuote || /\s/.test(String(quote || '').trim())) return null
  const matches = [...String(text || '').matchAll(new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapedQuote})(?=$|[^\\p{L}\\p{N}_])`, 'giu'))]
  return matches.length === 1 ? { index: matches[0].index + matches[0][1].length, length: matches[0][2].length } : null
}

function findEditorWordRange(editor, quote) {
  const escaped = String(quote || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped || /\s/.test(String(quote || '').trim())) return null
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  const matches = []
  let node
  while ((node = walker.nextNode())) {
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})(?=$|[^\\p{L}\\p{N}_])`, 'giu')
    for (const match of node.nodeValue.matchAll(regex)) {
      const start = match.index + match[1].length
      const range = editor.ownerDocument.createRange()
      range.setStart(node, start)
      range.setEnd(node, start + match[2].length)
      matches.push(range)
    }
  }
  return matches.length === 1 ? matches[0] : null
}

function findReviewQuoteRange(doc, quote, requireUnique = false) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const positions = []
  let visibleText = ''
  let previousBlock = null
  let node

  while ((node = walker.nextNode())) {
    const block = node.parentElement?.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,div,td,th') || doc.body
    if (visibleText && block !== previousBlock && !visibleText.endsWith('\n')) {
      visibleText += '\n'
      positions.push(null)
    }
    const value = node.nodeValue || ''
    for (let offset = 0; offset < value.length; offset += 1) {
      visibleText += value[offset]
      positions.push({ node, offset })
    }
    previousBlock = block
  }

  const normalizedText = []
  const normalizedMap = []
  let previousSpace = false
  for (let i = 0; i < visibleText.length; i += 1) {
    if (!positions[i]) {
      if (normalizedText.length && !previousSpace) {
        normalizedText.push(' ')
        normalizedMap.push(null)
        previousSpace = true
      }
      continue
    }
    const char = visibleText[i].replace(/[\u00a0\u202f]/g, ' ')
    if (/\s/.test(char)) {
      if (!previousSpace) {
        normalizedText.push(' ')
        normalizedMap.push(positions[i])
        previousSpace = true
      }
    } else {
      const normalizedChar = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').toLocaleLowerCase()
      for (let part = 0; part < normalizedChar.length; part += 1) {
        normalizedText.push(normalizedChar[part])
        normalizedMap.push(positions[i])
      }
      previousSpace = false
    }
  }

  const searchableText = normalizedText.join('')
  const normalizedQuote = normalizeReviewText(quote).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let start = searchableText.indexOf(normalizedQuote)
  let end = start < 0 ? -1 : start + normalizedQuote.length
  if (requireUnique && start >= 0 && searchableText.indexOf(normalizedQuote, end) >= 0) return null
  let normalizedPositions = normalizedMap
  if (start < 0 && /^\S+$/.test(normalizedQuote)) {
    const escaped = normalizedQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const wordMatches = [...searchableText.matchAll(new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})(?=$|[^\\p{L}\\p{N}_])`, 'gu'))]
    if (wordMatches.length !== 1) return null
    start = wordMatches[0].index + wordMatches[0][1].length
    end = start + wordMatches[0][2].length
  }
  if (start < 0) return null
  end = start + normalizedQuote.length

  if (normalizedPositions.slice(start, end).some((position) => !position)) return null
  const first = normalizedPositions[start]
  const last = normalizedPositions[end - 1]
  if (!first || !last) return null
  return { start: first, end: { node: last.node, offset: last.offset + 1 } }
}

function replaceReviewText(html, quote, replacement, removeSentence = false) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const match = findReviewQuoteRange(doc, quote, true)
  if (!match) return null
  const range = doc.createRange()
  range.setStart(match.start.node, match.start.offset)
  range.setEnd(match.end.node, match.end.offset)
  let block = match.start.node.parentElement?.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,div,td,th')
  if (removeSentence) {
    const startNode = range.startContainer
    const endNode = range.endContainer
    if (startNode.nodeType === Node.TEXT_NODE && range.startOffset > 0 && /\s/.test(startNode.nodeValue[range.startOffset - 1])) {
      range.setStart(startNode, range.startOffset - 1)
    } else if (endNode.nodeType === Node.TEXT_NODE && /\s/.test(endNode.nodeValue[range.endOffset] || '')) {
      range.setEnd(endNode, range.endOffset + 1)
    }
  }
  range.deleteContents()
  if (!removeSentence && replacement) range.insertNode(doc.createTextNode(replacement))
  if (removeSentence && block && /^(P|H[1-6]|LI|BLOCKQUOTE)$/.test(block.tagName) && !block.textContent.trim() && !block.querySelector('img,video,table,ul,ol')) block.remove()
  return doc.body.innerHTML
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
  const [reviewing, setReviewing] = useState(false)
  const [spellchecking, setSpellchecking] = useState(false)
  const [review, setReview] = useState(null)
  const [showNoSuggestionsNotice, setShowNoSuggestionsNotice] = useState(false)
  const [appliedFindings, setAppliedFindings] = useState([])
  const [dismissedFindings, setDismissedFindings] = useState([])
  const [findingStatusSaveErrors, setFindingStatusSaveErrors] = useState({})
  const [confirmation, setConfirmation] = useState(null)
  const [selectedTextForSpellcheck, setSelectedTextForSpellcheck] = useState('')
  const selectedTextRef = useRef('')
  const selectedRangeRef = useRef(null)
  const [reviewHistory, setReviewHistory] = useState([])
  const [showOlderReviewHistory, setShowOlderReviewHistory] = useState(false)
  const [reviewHistoryExpanded, setReviewHistoryExpanded] = useState(false)
  const [media, setMedia] = useState([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaInput = useRef(null)
  const editorRef = useRef(null)
  const titleInputRef = useRef(null)
  const titleWordTimer = useRef(null)
  const [newCategory, setNewCategory] = useState(null)
  const [newAudience, setNewAudience] = useState(null)
  const generatingRef = useRef(false)
  const selectedCategory = categories.find((category) => String(category.id) === String(article.category_id))
  const imageSrc = mediaUrl(article.featured_media_path || article.featured_image)

  const clearCurrentReview = () => {
    if (review?.id) setReviewHistory((current) => current.some((item) => item.id === review.id) ? current : [review, ...current])
    setReview(null)
    setAppliedFindings([])
    setDismissedFindings([])
    setFindingStatusSaveErrors({})
  }
  const set = (name) => (e) => {
    setArticle((a) => ({ ...a, [name]: e.target.value }))
    clearCurrentReview()
  }
  const setAI = (name) => (e) => setAi((a) => ({ ...a, [name]: e.target.value }))
  const setCategory = (e) => {
    setArticle((current) => ({ ...current, category_id: e.target.value }))
    setTopics([])
    clearCurrentReview()
  }

  const loadMedia = useCallback(() => api.media().then(setMedia).catch(() => {}), [])
  useEffect(() => { loadMedia() }, [loadMedia])

  const assignMedia = (item) => {
    setArticle((current) => ({ ...current, featured_media_id: item?.id || null, featured_media_path: item?.filepath || '', featured_image: '', featured_image_credit: item?.credit || '' }))
    setMediaPickerOpen(false)
  }

  const uploadFeatured = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return toast.error('Choose a JPG, PNG, WebP, or GIF image.')
    if (file.size > 12 * 1024 * 1024) return toast.error('Images must be 12 MB or smaller.')
    setUploadingMedia(true)
    try {
      const item = await api.uploadMedia(file)
      setMedia((current) => [item, ...current])
      assignMedia(item)
      toast.success('Featured image uploaded')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setUploadingMedia(false) }
  }

  const loadCategories = useCallback(
    () => api.categories().then(setCategories).catch((e) => toast.error(errorMessage(e))),
    [],
  )

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    const toolbar = editorRef.current?.getEditor()?.container?.previousElementSibling
    if (!toolbar) return
    const tooltips = [
      ['.ql-header .ql-picker-label', 'Choose paragraph or heading style'],
      ['.ql-bold', 'Bold'],
      ['.ql-italic', 'Italic'],
      ['.ql-underline', 'Underline'],
      ['.ql-link', 'Insert or edit a link'],
      ['.ql-list[value="ordered"]', 'Numbered list'],
      ['.ql-list[value="bullet"]', 'Bulleted list'],
      ['.ql-clean', 'Clear text formatting'],
    ]
    tooltips.forEach(([selector, label]) => {
      const control = toolbar.querySelector(selector)
      if (!control) return
      control.setAttribute('data-tooltip', label)
      control.setAttribute('aria-label', label)
    })
  }, [])

  useEffect(() => {
    if (!review || review.findings.length > 0) {
      setShowNoSuggestionsNotice(false)
      return undefined
    }
    setShowNoSuggestionsNotice(true)
    const timer = window.setTimeout(() => setShowNoSuggestionsNotice(false), 5000)
    return () => window.clearTimeout(timer)
  }, [review?.id, review?.reviewedAt, review?.findings?.length])

  useEffect(() => {
    api.settings().then((settings) => {
      setWritingSettings(settings)
      setAi((current) => ({ ...current, targetAudience: settings.audience, language: settings.language, tone: settings.tone, articleLength: settings.articleLength }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setArticleId(id || null)
    setReview(null)
    setReviewHistory([])
    setShowOlderReviewHistory(false)
    setReviewHistoryExpanded(false)
    setAppliedFindings([])
    setDismissedFindings([])
    setFindingStatusSaveErrors({})
    if (!id) { setArticle(EMPTY); return () => { active = false } }
    api.article(id).then((a) => { if (active) setArticle(pick(a)) }).catch((e) => { if (active) toast.error(errorMessage(e)) })
    api.articleReviewHistory(id).then((history) => {
      if (!active) return
      const [latest, ...older] = history || []
      setReview(latest || null)
      setReviewHistory(older)
      setAppliedFindings(latest?.findings?.flatMap((finding, index) => finding.status === 'applied' ? [index] : []) || [])
      setDismissedFindings(latest?.findings?.flatMap((finding, index) => finding.status === 'dismissed' ? [index] : []) || [])
    }).catch((e) => { if (active) toast.error(`Could not load article review history: ${errorMessage(e)}`) })
    return () => { active = false }
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
      if (article.featured_media_id) {
        await api.updateMedia(article.featured_media_id, { credit: article.featured_image_credit || '' })
      }
      if (articleId) {
        await api.updateArticle(articleId, payload(article))
        toast.success('Article updated')
      } else {
        const { id: newId } = await api.createArticle(payload(article))
        setArticleId(newId)
        if (review && !review.id) {
          try { setReview(await api.saveArticleReviewHistory(newId, review)) }
          catch (reviewError) { toast.error(`Article saved, but its review history could not be saved: ${errorMessage(reviewError)}`) }
        }
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

  const reviewCurrentArticle = async () => {
    if (!article.title.trim() || !article.content.trim()) return toast.error('Add an article title and content before reviewing.')
    setReviewing(true)
    try {
      const result = await api.reviewArticle({ articleId, category: selectedCategory?.name || '', title: article.title, excerpt: article.excerpt, content: article.content })
      if (articleId && result.id) {
        const history = await api.articleReviewHistory(articleId)
        setReviewHistory(history.slice(1))
        setReview(history[0] || result)
      } else {
        if (review) setReviewHistory((current) => [review, ...current])
        setReview(result)
      }
      setAppliedFindings([])
      setDismissedFindings([])
      setFindingStatusSaveErrors({})
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setReviewing(false) }
  }

  const spellcheckArticle = async () => {
    if (!article.title.trim() || !article.content.trim()) return toast.error('Add an article title and content before checking spelling.')
    setSpellchecking(true)
    try {
      const result = await api.spellcheckArticle({ articleId, title: article.title, content: article.content, language: ai.language })
      if (articleId && result.id) {
        const history = await api.articleReviewHistory(articleId)
        setReviewHistory(history.slice(1))
        setReview(history[0] || result)
      } else {
        if (review) setReviewHistory((current) => [review, ...current])
        setReview(result)
      }
      setAppliedFindings([])
      setDismissedFindings([])
      setFindingStatusSaveErrors({})
      toast.success(result.findings.length ? `Found ${result.findings.length} possible spelling issue${result.findings.length === 1 ? '' : 's'}.` : 'No spelling issues found.')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSpellchecking(false) }
  }

  const captureSelectedText = () => {
    const editor = editorRef.current?.getEditor()
    const selection = editor?.getSelection()
    const rawSelected = selection?.length ? editor.getText(selection.index, selection.length) : ''
    const leadingTrim = rawSelected.length - rawSelected.trimStart().length
    const selected = rawSelected.trim()
    selectedTextRef.current = selected
    selectedRangeRef.current = selected ? { index: selection.index + leadingTrim, length: selected.length } : null
    setSelectedTextForSpellcheck(selected)
  }

  const spellcheckSelectedText = async () => {
    const selectedText = selectedTextRef.current.trim()
    if (!selectedText) return toast.info('Select a word or passage in the article first.')
    if (selectedText.length > 12000) return toast.error('Select a passage shorter than 12,000 characters.')
    setSpellchecking(true)
    try {
      const quill = editorRef.current?.getEditor()
      const range = selectedRangeRef.current
      const fullText = quill?.getText() || ''
      const context = range ? fullText.slice(Math.max(0, range.index - 500), Math.min(fullText.length, range.index + range.length + 500)) : selectedText
      const result = await api.spellcheckArticle({ articleId, title: '', content: '', selectedText, context, language: ai.language })
      result.findings = (result.findings || []).map((finding) => ({ ...finding, selectionRange: selectedRangeRef.current }))
      if (articleId && result.id) {
        const history = await api.articleReviewHistory(articleId)
        setReviewHistory(history.slice(1))
        const latest = history[0] || result
        setReview({ ...latest, findings: latest.findings.map((finding) => ({ ...finding, selectionRange: result.findings.find((item) => item.id === finding.id)?.selectionRange || null })) })
      } else {
        if (review) setReviewHistory((current) => [review, ...current])
        setReview(result)
      }
      setAppliedFindings([])
      setDismissedFindings([])
      setFindingStatusSaveErrors({})
      toast.success(result.findings.length ? `Found ${result.findings.length} possible spelling issue${result.findings.length === 1 ? '' : 's'} in the selection.` : 'No spelling issues found in the selection.')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSpellchecking(false) }
  }

  const dismissAllFindings = async () => {
    if (!review) return
    const pending = review.findings.map((finding, index) => ({ finding, index }))
      .filter(({ index }) => !appliedFindings.includes(index) && !dismissedFindings.includes(index))
    if (!pending.length) return toast.info('There are no suggestions to dismiss.')
    requestConfirmation(`Dismiss ${pending.length} suggestions?`, 'They will be hidden from this review and kept in this article’s review history.', async () => {
      for (const { finding, index } of pending) await markFindingStatus(finding, index, 'dismissed', 'dismissed')
      toast.success(`Dismissed ${pending.length} suggestion${pending.length === 1 ? '' : 's'}.`)
    }, 'Dismiss all')
  }

  const locateSpellingFinding = (finding) => {
    if (finding.field === 'title') {
      const titleMatch = findWordMatch(article.title, finding.quote)
      if (!titleMatch) return toast.error('Could not locate this word uniquely in the title.')
      const input = titleInputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(titleMatch.index, titleMatch.index + titleMatch.length)
      window.clearTimeout(titleWordTimer.current)
      titleWordTimer.current = window.setTimeout(() => input.setSelectionRange(titleMatch.index, titleMatch.index + titleMatch.length), 1200)
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const editor = editorRef.current?.getEditor()?.root
    const range = editor && findEditorWordRange(editor, finding.quote)
    if (!editor || !range) return toast.error('Could not locate this word uniquely in the article.')
    editor.focus()
    const selection = editor.ownerDocument.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    if (window.CSS?.highlights && window.Highlight) {
      window.CSS.highlights.set('review-spelling-target', new window.Highlight(range))
    }
    range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const requestConfirmation = (title, message, onConfirm, confirmLabel = 'Confirm') => {
    setConfirmation({ title, message, onConfirm, confirmLabel })
  }

  const markFindingStatus = (finding, index, status, action = null) => {
    let statusRequest = Promise.resolve(true)
    if (finding.id && articleId) {
      statusRequest = api.updateReviewFinding(finding.id, { articleId, status, action })
        .then(() => {
          setFindingStatusSaveErrors((current) => { const next = { ...current }; delete next[finding.id]; return next })
          return true
        })
        .catch((e) => {
          setFindingStatusSaveErrors((current) => ({ ...current, [finding.id]: { status, action } }))
          toast.error(`The editor changed, but could not save this suggestion's status: ${errorMessage(e)}`)
          return false
        })
    }
    setReview((current) => current ? ({
      ...current,
      findings: current.findings.map((item, itemIndex) => itemIndex === index ? { ...item, status, action } : item),
    }) : current)
    if (status === 'applied') setAppliedFindings((current) => [...new Set([...current, index])])
    if (status === 'dismissed') setDismissedFindings((current) => [...new Set([...current, index])])
    return statusRequest
  }

  const retryFindingStatusSave = (finding) => {
    const pending = findingStatusSaveErrors[finding.id]
    if (!pending || !articleId) return
    api.updateReviewFinding(finding.id, { articleId, ...pending }).then(() => {
      setFindingStatusSaveErrors((current) => { const next = { ...current }; delete next[finding.id]; return next })
      toast.success('Suggestion status saved to review history.')
    }).catch((e) => toast.error(`Could not save this suggestion's status: ${errorMessage(e)}`))
  }

  const dismissFinding = (finding, index) => {
    const request = markFindingStatus(finding, index, 'dismissed', 'dismissed')
    if (!finding.id) toast.info('Dismissed for this session. Saving the article will keep this dismissal in its review history.')
    else request.then((saved) => saved && toast.success('Suggestion dismissed and saved in this article’s review history.'))
  }

  const applyFinding = (finding, index) => {
    if (finding.type === 'fact_check') return
    if (finding.field === 'title') {
      const currentValue = String(article[finding.field] || '')
      const suggestion = finding.suggestion.trim()
      if (!suggestion) return toast.error('The AI did not provide replacement text for this suggestion.')
      const wordLevelSpelling = finding.type === 'spelling' && !/\s/.test(finding.quote.trim())
      const updatedTitle = wordLevelSpelling ? replaceTitleWord(currentValue, finding.quote.trim(), suggestion) : suggestion
      if (!updatedTitle) return toast.error('Could not find the quoted word in the current title. Rerun the spelling check and try again.')
      if (normalizeReviewTitle(currentValue) === normalizeReviewTitle(updatedTitle)) {
        markFindingStatus(finding, index, 'applied', 'replace_field')
        toast.info('The suggested title is already in the editor; saving its review status.')
        return
      }
      const preview = wordLevelSpelling
        ? `Replace this word in the title?\n\nBEFORE:\n${currentValue}\n\nAFTER:\n${updatedTitle}`
        : `Replace the current title with this suggestion?\n\nCURRENT TITLE:\n${currentValue}\n\nSUGGESTED TITLE:\n${updatedTitle}`
      requestConfirmation(wordLevelSpelling ? 'Apply spelling correction?' : 'Apply title suggestion?', preview, () => {
        setArticle((current) => ({ ...current, [finding.field]: updatedTitle }))
        markFindingStatus(finding, index, 'applied', 'replace_field')
      }, 'Apply change')
      return
    }
    const doc = new DOMParser().parseFromString(article.content || '', 'text/html')
    if (finding.selectionRange && finding.field === 'content') {
      const quill = editorRef.current?.getEditor()
      const { index: selectionIndex, length } = finding.selectionRange
      const selected = quill?.getText(selectionIndex, length) || ''
      const quoteIndex = selected.toLocaleLowerCase().indexOf(finding.quote.toLocaleLowerCase())
      if (!quill || quoteIndex < 0 || selected.toLocaleLowerCase().indexOf(finding.quote.toLocaleLowerCase(), quoteIndex + finding.quote.length) >= 0) {
        return toast.error('Could not uniquely match that word within the selected passage. Select the passage again and rerun the spelling check.')
      }
      quill.deleteText(selectionIndex + quoteIndex, finding.quote.length, 'api')
      quill.insertText(selectionIndex + quoteIndex, finding.suggestion, 'api')
      const lengthDelta = finding.suggestion.length - finding.quote.length
      setReview((current) => current ? ({
        ...current,
        findings: current.findings.map((item) => item.selectionRange
          ? { ...item, selectionRange: { index: item.selectionRange.index, length: item.selectionRange.length + lengthDelta } }
          : item),
      }) : current)
      markFindingStatus(finding, index, 'applied', 'replace_selected_text')
      return
    }
    const wordOnlySpelling = finding.type === 'spelling' && finding.field === 'content' && /^\S+$/.test(finding.quote)
    const match = findReviewQuoteRange(doc, finding.quote, true) || (wordOnlySpelling ? findReviewQuoteRange(doc, finding.quote, false) : null)
    if (!match) return toast.error('Could not match the quoted passage. Rerun the review and try again.')
    const range = doc.createRange()
    range.setStart(match.start.node, match.start.offset)
    range.setEnd(match.end.node, match.end.offset)
    range.deleteContents()
    range.insertNode(doc.createTextNode(finding.suggestion))
    setArticle((current) => ({ ...current, content: doc.body.innerHTML }))
    markFindingStatus(finding, index, 'applied', 'replace_text')
  }

  const applyFactCheckAction = (finding, index, action) => {
    const sentence = String(finding.sentenceQuote || '').trim()
    if (!sentence) return toast.error('This finding has no complete sentence to safely edit. Rerun the review to get updated context.')
    const replacement = action === 'rewrite' ? String(finding.neutralRewrite || '').trim() : ''
    if (action === 'rewrite' && !replacement) return toast.error('No neutral rewrite is available for this finding. Remove the sentence or rerun the review.')
    const preview = action === 'remove'
      ? `Remove this complete sentence from the editor?\n\nBEFORE:\n${sentence}\n\nAFTER:\n[Sentence removed]`
      : `Replace this sentence with the neutral rewrite?\n\nBEFORE:\n${sentence}\n\nAFTER:\n${replacement}`
    requestConfirmation(action === 'remove' ? 'Remove this sentence?' : 'Use the neutral rewrite?', preview, () => {
      const content = replaceReviewText(article.content, sentence, replacement, action === 'remove')
      if (content === null) return toast.error('Could not match the reviewed sentence. Rerun the review and try again.')
      setArticle((current) => ({ ...current, content }))
      markFindingStatus(finding, index, 'applied', action === 'remove' ? 'remove_sentence' : 'neutral_rewrite')
      toast.success(action === 'remove' ? 'Sentence removed from the editor.' : 'Neutral rewrite applied to the editor.')
    }, action === 'remove' ? 'Remove sentence' : 'Apply rewrite')
  }

  const applyAllFindings = () => {
    const pending = review.findings
      .map((finding, index) => ({ finding, index }))
      .filter(({ finding, index }) => finding.type !== 'fact_check' && !appliedFindings.includes(index) && !dismissedFindings.includes(index))
    if (!pending.length) return toast.info('There are no unapplied editable suggestions.')

    let nextArticle = { ...article }
    const applied = []
    const skipped = []
    const previewRows = []
    for (const { finding, index } of pending) {
      const field = finding.field === 'title' ? finding.field : 'content'
      const suggestion = String(finding.suggestion || '').trim()
      if (!suggestion) { skipped.push(index); continue }
      if (field === 'title') {
        const wordLevelSpelling = finding.type === 'spelling' && !/\s/.test(finding.quote.trim())
        const updatedTitle = wordLevelSpelling ? replaceTitleWord(nextArticle[field] || '', finding.quote.trim(), suggestion) : suggestion
        if (!updatedTitle || normalizeReviewTitle(nextArticle[field] || '') === normalizeReviewTitle(updatedTitle)) { skipped.push(index); continue }
        previewRows.push(`Title:\n  ${nextArticle[field]}\n→ ${updatedTitle}`)
        nextArticle[field] = updatedTitle
      } else {
        const doc = new DOMParser().parseFromString(nextArticle.content || '', 'text/html')
        const match = findReviewQuoteRange(doc, finding.quote, true)
        if (!match) { skipped.push(index); continue }
        previewRows.push(`Article text:\n  ${finding.quote}\n→ ${suggestion}`)
        const range = doc.createRange()
        range.setStart(match.start.node, match.start.offset)
        range.setEnd(match.end.node, match.end.offset)
        range.deleteContents()
        range.insertNode(doc.createTextNode(suggestion))
        nextArticle.content = doc.body.innerHTML
      }
      applied.push(index)
    }

    if (applied.length) {
      const preview = previewRows.slice(0, 8).join('\n\n') + (previewRows.length > 8 ? `\n\n…and ${previewRows.length - 8} more change(s).` : '')
      requestConfirmation(`Apply ${applied.length} suggestions?`, preview, () => {
        setArticle(nextArticle)
        setAppliedFindings((current) => [...new Set([...current, ...applied])])
        const appliedSet = new Set(applied)
        for (const { finding, index } of pending) {
          if (appliedSet.has(index)) markFindingStatus(finding, index, 'applied', 'apply_all')
        }
        if (skipped.length) toast.info(`Applied ${applied.length} suggestion${applied.length === 1 ? '' : 's'}; skipped ${skipped.length} that no longer matched or had no replacement.`)
        else toast.success(`Applied ${applied.length} suggestion${applied.length === 1 ? '' : 's'} to the editor.`)
      }, 'Apply all changes')
      return
    }
    if (skipped.length) toast.info(`Applied ${applied.length} suggestion${applied.length === 1 ? '' : 's'}; skipped ${skipped.length} that no longer matched or had no replacement.`)
    else toast.success(`Applied ${applied.length} suggestion${applied.length === 1 ? '' : 's'} to the editor.`)
  }

  const onArticleContentChange = (content, _delta, source) => {
    setArticle((current) => ({ ...current, content }))
    if (source === 'user') {
      clearCurrentReview()
    }
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
    if (!cat) return
    requestConfirmation('Delete category?', `Delete “${cat.name}”?`, async () => {
      try {
        await api.deleteCategory(cat.id)
        setArticle((a) => ({ ...a, category_id: '' }))
        await loadCategories()
      } catch (e) { toast.error(`Could not delete category: ${errorMessage(e)}`) }
    }, 'Delete category')
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
        <Input ref={titleInputRef} value={article.title} onChange={set('title')} placeholder="Article title" className="h-11 text-base" />
        <div className="editor-quill" onMouseUp={captureSelectedText} onKeyUp={captureSelectedText}>
          <ReactQuill ref={editorRef} theme="snow" value={article.content} onChange={onArticleContentChange} />
        </div>
        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium">Spell-check selected text</p>
            <p className="mt-2 text-xs text-muted-foreground">Select a word or passage in the editor, then check only that selection.</p>
            {selectedTextForSpellcheck
              ? <p className="mt-1 truncate text-xs text-foreground" title={selectedTextForSpellcheck}>Selected: “{selectedTextForSpellcheck}”</p>
              : <p className="mt-1 text-xs text-muted-foreground">No text selected yet.</p>}
          </div>
          <Button type="button" variant="outline" onMouseDown={(event) => { event.preventDefault(); captureSelectedText() }} onClick={spellcheckSelectedText} disabled={spellchecking || saving || !selectedTextForSpellcheck}>
            {spellchecking ? <Loader2 className="animate-spin" /> : <Check />} {spellchecking ? 'Checking selection…' : 'Check selection'}
          </Button>
        </div>
        <Card className="gap-4 py-4">
          <CardHeader className="grid gap-2 px-4">
            <div><CardTitle className="text-sm">Full-article checks</CardTitle><p className="mt-2 text-xs text-muted-foreground">Choose a check:</p></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="w-full" onClick={spellcheckArticle} disabled={reviewing || spellchecking || saving || !article.title || !article.content}>
                {spellchecking ? <Loader2 className="animate-spin" /> : <Check />} {spellchecking ? 'Checking spelling…' : 'Spell check'}
              </Button>
              <Button type="button" variant="outline" className={`w-full ${reviewing ? 'animate-pulse border-sky-600 bg-sky-600 text-white hover:bg-sky-600 disabled:opacity-100' : ''}`} onClick={reviewCurrentArticle} disabled={reviewing || spellchecking || saving || !article.title || !article.content}>
                {reviewing ? <Loader2 className="animate-spin" /> : <Sparkles />} {reviewing ? 'Reviewing…' : 'Full article review'}
              </Button>
            </div>
          </CardHeader>
          {review && <CardContent className="grid gap-3 px-4">
            {review.findings.length > 0 && <p className="text-xs text-muted-foreground">AI check done by: {review.model || 'selected model'} · {new Date(review.reviewedAt).toLocaleString()}</p>}
            {review.findings.some((finding) => finding.type === 'fact_check') && <p className="text-xs text-muted-foreground">Fact-check suggestions need manual verification; no live sources were checked.</p>}
            {review.titleReviewNote && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{review.titleReviewNote}</p>}
            {!review.findings.length && <p aria-hidden={!showNoSuggestionsNotice} className={`flex flex-wrap items-center justify-between overflow-hidden gap-x-3 gap-y-1 rounded-md bg-muted text-sm transition-[opacity,max-height,margin,padding] duration-500 ease-out ${showNoSuggestionsNotice ? 'max-h-16 px-3 py-2 opacity-100' : 'max-h-0 px-3 py-0 opacity-0'}`}><span>No suggestions found.</span><span className="text-xs text-muted-foreground">AI check done by: {review.model || 'selected model'} · {new Date(review.reviewedAt).toLocaleString()}</span></p>}
            {review.findings.some((_finding, index) => !appliedFindings.includes(index) && !dismissedFindings.includes(index)) && <div className="flex flex-wrap gap-2">
              {review.findings.some((finding, index) => finding.type !== 'fact_check' && !appliedFindings.includes(index) && !dismissedFindings.includes(index)) && <Button type="button" size="sm" onClick={applyAllFindings}><Check /> Apply all suggestions</Button>}
              <Button type="button" size="sm" variant="outline" onClick={dismissAllFindings}><X /> Dismiss all suggestions</Button>
            </div>}
            {review.findings.map((finding, index) => {
              const applied = appliedFindings.includes(index)
              const dismissed = dismissedFindings.includes(index)
              const handled = applied || dismissed
              const factCheck = finding.type === 'fact_check'
              const severityColor = finding.severity === 'high'
                ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
                : finding.severity === 'medium'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500'
                  : 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500'
              return <div key={`${index}-${finding.quote}`} className={`grid overflow-hidden transition-[opacity,max-height,margin,padding] duration-300 ease-out ${handled ? 'max-h-0 -my-2 border-0 p-0 opacity-0' : 'max-h-[1000px] gap-2 rounded-md border p-3 opacity-100'} ${factCheck && !handled ? 'border-yellow-500 bg-yellow-200/90 dark:border-yellow-600 dark:bg-yellow-900/50' : ''}`} aria-hidden={handled}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium"><span className="rounded-full bg-muted px-2 py-1">{finding.field} · {finding.type.replace('_', ' ')}</span><span className="text-muted-foreground">{finding.severity} priority</span></div>
                <p className="text-sm"><span className="font-medium">“{finding.quote}”</span> — {finding.explanation}</p>
                <p className="text-sm text-muted-foreground"><span className="font-medium">Suggestion:</span> {finding.suggestion}</p>
                {finding.type === 'spelling' && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => locateSpellingFinding(finding)}>Locate in article</Button>}
                {factCheck && finding.sentenceQuote && <p className="rounded bg-yellow-100/80 p-2 text-sm dark:bg-yellow-950/40"><span className="font-medium">Sentence in article:</span> “{finding.sentenceQuote}”</p>}
                {factCheck && finding.neutralRewrite && <p className="text-sm text-muted-foreground"><span className="font-medium">Neutral rewrite:</span> {finding.neutralRewrite}</p>}
                {finding.type === 'fact_check'
                  ? <div className="flex flex-wrap gap-2">
                    {handled ? <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Check className="size-4" /> {dismissed ? 'Suggestion dismissed' : 'Updated in editor'}</span> : <>
                      <Button type="button" variant="outline" size="sm" disabled={!finding.sentenceQuote} onClick={() => applyFactCheckAction(finding, index, 'remove')}>Remove sentence</Button>
                      <Button type="button" variant="outline" size="sm" disabled={!finding.neutralRewrite} onClick={() => applyFactCheckAction(finding, index, 'rewrite')}>Use neutral rewrite</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => dismissFinding(finding, index)}>Dismiss suggestion</Button>
                    </>}
                  </div>
                  : <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" className={`w-fit ${severityColor}`} disabled={handled} onClick={() => applyFinding(finding, index)}>{handled ? <Check /> : <AlertTriangle />}{dismissed ? 'Suggestion dismissed' : applied ? 'Applied to editor' : 'Apply suggestion'}</Button>
                    {!handled && <Button type="button" variant="ghost" size="sm" onClick={() => dismissFinding(finding, index)}>Dismiss suggestion</Button>}
                  </div>}
                {findingStatusSaveErrors[finding.id] && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => retryFindingStatusSave(finding)}>Retry saving status</Button>}
              </div>
            })}
            {review.findings.some((_finding, index) => appliedFindings.includes(index) || dismissedFindings.includes(index)) && <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">Handled suggestions ({appliedFindings.length + dismissedFindings.length})</summary>
              <div className="mt-3 grid gap-2">{review.findings.map((finding, index) => {
                const status = appliedFindings.includes(index) ? 'applied' : dismissedFindings.includes(index) ? 'dismissed' : null
                if (!status) return null
                return <div key={`handled-${index}`} className="rounded bg-muted/50 p-2 text-xs"><p className="font-medium">{finding.field} · {finding.type.replace('_', ' ')} · {status}</p><p>“{finding.quote}” — {finding.explanation}</p></div>
              })}</div>
            </details>}
          </CardContent>}
        </Card>
        {reviewHistory.length > 0 && <Card className="overflow-hidden py-0">
          <button type="button" aria-expanded={reviewHistoryExpanded} onClick={() => setReviewHistoryExpanded((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40">
            <span>Previous review history <span className="text-muted-foreground">({reviewHistory.length})</span></span>
            <span className="text-xs text-muted-foreground">{reviewHistoryExpanded ? 'Hide' : 'Show'}</span>
          </button>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${reviewHistoryExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="min-h-0 overflow-hidden">
              <CardContent className="grid gap-2 border-t px-4 py-3">
              {(showOlderReviewHistory ? reviewHistory : reviewHistory.slice(0, 3)).map((past) => <details key={past.id} className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm">{new Date(past.reviewedAt).toLocaleString()} · {past.findings.length} suggestion{past.findings.length === 1 ? '' : 's'}</summary>
                <div className="mt-3 grid gap-2">
                  {past.findings.map((finding) => <div key={finding.id} className="rounded bg-muted/50 p-2 text-xs">
                    <p className="font-medium">{finding.field} · {finding.type.replace('_', ' ')} · {finding.status}</p>
                    <p>“{finding.quote}” — {finding.explanation}</p>
                  </div>)}
                </div>
              </details>)}
              {reviewHistory.length > 3 && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShowOlderReviewHistory((current) => !current)}>
                {showOlderReviewHistory ? 'Show fewer reviews' : `Show older reviews (${reviewHistory.length - 3})`}
              </Button>}
              </CardContent>
            </div>
          </div>
        </Card>}
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <Card className="gap-4 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">Featured image</CardTitle></CardHeader>
          <CardContent className="grid gap-3 px-4">
            {imageSrc ? <img src={imageSrc} alt="Featured image preview" className="aspect-[16/9] w-full rounded-md border bg-muted object-cover" /> : <div className="grid aspect-[16/9] place-items-center rounded-md border border-dashed bg-muted/30 text-muted-foreground"><ImagePlus className="size-7" /></div>}
            {imageSrc && article.featured_media_id && <Field label="Photo credit/source"><Input value={article.featured_image_credit || ''} onChange={set('featured_image_credit')} placeholder="e.g. Michael Henniway" maxLength={500} /></Field>}
            {imageSrc && !article.featured_media_id && <p className="text-xs text-muted-foreground">To save a credit for this image, upload it to the Media Library and select it here.</p>}
            <input ref={mediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadFeatured} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => mediaInput.current?.click()} disabled={uploadingMedia}>{uploadingMedia ? <Loader2 className="animate-spin" /> : <Upload />} Upload</Button>
              <Button type="button" variant="outline" onClick={() => { loadMedia(); setMediaPickerOpen(true) }}><Images /> Choose</Button>
            </div>
            {imageSrc && <Button type="button" variant="ghost" size="sm" onClick={() => assignMedia(null)} className="text-muted-foreground">Remove featured image</Button>}
            <p className="text-xs text-muted-foreground">Add a credit/source for this image. It will appear beneath the image on the public blog when you save.</p>
          </CardContent>
        </Card>

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
      {confirmation && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmation(null) }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="editor-confirmation-title" className="grid max-h-[85vh] w-full max-w-xl gap-4 overflow-hidden rounded-xl border bg-background p-5 text-foreground shadow-xl">
          <div className="grid gap-2"><h2 id="editor-confirmation-title" className="font-semibold">{confirmation.title}</h2><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-sans text-sm text-muted-foreground">{confirmation.message}</pre></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setConfirmation(null)}>Cancel</Button><Button type="button" onClick={() => { const current = confirmation; setConfirmation(null); current.onConfirm() }}>{confirmation.confirmLabel}</Button></div>
        </div>
      </div>}
      {mediaPickerOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMediaPickerOpen(false) }}>
        <div role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="grid max-h-[85vh] w-full max-w-4xl gap-4 overflow-hidden rounded-xl border bg-background p-5 shadow-xl">
          <div className="flex items-center justify-between"><div><h2 id="media-picker-title" className="font-semibold">Choose featured image</h2><p className="text-sm text-muted-foreground">Select an image from your Media Library.</p></div><Button variant="ghost" size="icon" onClick={() => setMediaPickerOpen(false)} aria-label="Close media picker"><X /></Button></div>
          <div className="grid min-h-0 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => <button type="button" key={item.id} onClick={() => assignMedia(item)} className="group overflow-hidden rounded-lg border text-left transition hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"><img src={mediaUrl(item.filepath)} alt="" className="aspect-[16/10] w-full bg-muted object-cover" loading="lazy" /><span className="block truncate p-2 text-xs" title={item.filename}>{item.filename}</span></button>)}
            {!media.length && <div className="grid justify-items-center gap-2 py-12 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3"><Images className="size-7" />No images yet. Upload one to get started.</div>}
          </div>
        </div>
      </div>}
    </div>
  )
}

