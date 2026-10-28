import { BookOpenCheck, CheckCircle2, Database, FileCheck2, Languages, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { toast } from 'sonner'

const EMPTY_REFERENCE = { languageId: 'nl', referenceType: 'spelling', sourceName: '', license: '', version: '', sourceReference: '', checksum: '', reviewState: 'planned', validationState: 'not-validated' }

function PolicyItem({ title, children }) {
  return <div className="grid gap-1 border-t pt-4 first:border-t-0 first:pt-0"><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{children}</p></div>
}

export default function LanguageLibraryPage() {
  const [catalog, setCatalog] = useState(null)
  const [references, setReferences] = useState([])
  const [referenceForm, setReferenceForm] = useState(EMPTY_REFERENCE)
  const [editingId, setEditingId] = useState(null)
  const [savingReference, setSavingReference] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.languageLibraryCatalog(), api.languageReferences()])
      .then(([nextCatalog, nextReferences]) => { setCatalog(nextCatalog); setReferences(nextReferences) })
      .catch((reason) => setError(errorMessage(reason)))
  }, [])

  const setReference = (key) => (event) => setReferenceForm((current) => ({ ...current, [key]: event.target.value }))
  const resetReference = () => { setReferenceForm(EMPTY_REFERENCE); setEditingId(null) }
  const saveReference = async (event) => {
    event.preventDefault()
    setSavingReference(true)
    try {
      const saved = editingId ? await api.updateLanguageReference(editingId, referenceForm) : await api.createLanguageReference(referenceForm)
      setReferences((current) => editingId ? current.map((reference) => reference.id === saved.id ? saved : reference) : [...current, saved].sort((a, b) => a.languageId.localeCompare(b.languageId) || a.referenceType.localeCompare(b.referenceType)))
      toast.success(editingId ? 'Language reference updated' : 'Language reference recorded')
      resetReference()
    } catch (reason) { toast.error(errorMessage(reason)) }
    finally { setSavingReference(false) }
  }
  const editReference = (reference) => { setReferenceForm({ languageId: reference.languageId, referenceType: reference.referenceType, sourceName: reference.sourceName, license: reference.license, version: reference.version, sourceReference: reference.sourceReference, checksum: reference.checksum || '', reviewState: reference.reviewState, validationState: reference.validationState }); setEditingId(reference.id) }
  const removeReference = async (reference) => {
    try { await api.deleteLanguageReference(reference.id); setReferences((current) => current.filter((item) => item.id !== reference.id)); if (editingId === reference.id) resetReference(); toast.success('Language reference removed') }
    catch (reason) { toast.error(errorMessage(reason)) }
  }

  if (error) return <div className="mx-auto max-w-5xl"><h2 className="text-lg font-semibold">Language Library</h2><p className="mt-2 text-sm text-destructive">Could not load the language-library foundation: {error}</p></div>
  if (!catalog) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading language library…</div>

  const enabledCount = catalog.languages.filter((language) => language.enabled).length
  return <div className="mx-auto grid max-w-5xl gap-6">
    <div><h2 className="text-lg font-semibold">Language Library</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Manage the approved language foundation and local reference-source readiness for editorial review. This page will grow into the home for language settings and governed references. Phase 1 establishes policy only: it does not install dictionaries or activate live spelling or grammar validation.</p></div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><Languages className="size-4" /> Approved languages</CardTitle></CardHeader><CardContent className="px-5 text-2xl font-semibold">{enabledCount}</CardContent></Card>
      <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Review authority</CardTitle></CardHeader><CardContent className="px-5 text-sm text-muted-foreground">Editor language selection</CardContent></Card>
      <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><Database className="size-4" /> Reference records</CardTitle></CardHeader><CardContent className="px-5 text-sm text-muted-foreground">{references.length ? `${references.length} recorded · none active` : 'Pending controlled setup'}</CardContent></Card>
    </div>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Review language policy</CardTitle><CardDescription>These guardrails prevent an AI or automatic detector from treating an uncertain guess as an approved correction.</CardDescription></CardHeader><CardContent className="grid gap-4 px-5 md:grid-cols-2"><PolicyItem title="Primary language">{catalog.policy.primaryLanguage}</PolicyItem><PolicyItem title="Detection safeguard">{catalog.policy.detection}</PolicyItem><PolicyItem title="Ambiguous or mixed language">{catalog.policy.ambiguousText}</PolicyItem><PolicyItem title="Reference-source standard">{catalog.policy.references}</PolicyItem></CardContent></Card>

    <div className="grid gap-4 md:grid-cols-2">
      {catalog.languages.map((language) => <Card key={language.id} className="gap-4 py-5"><CardHeader className="px-5"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="size-4" /> {language.name}</CardTitle><CardDescription>{language.nativeName} · Used by the Editor as “{language.editorValue}”</CardDescription></div><Badge variant="secondary"><CheckCircle2 className="size-3" /> Approved</Badge></div></CardHeader><CardContent className="grid gap-2 px-5">{language.references.map((reference) => { const recorded = references.find((item) => item.languageId === language.id && item.referenceType === (reference.id === 'spelling' ? 'spelling' : 'grammar')); return <div className="flex items-center justify-between gap-3 text-sm" key={reference.id}><span>{reference.name}</span><Badge variant="outline">{recorded ? `${recorded.reviewState} · ${recorded.validationState}` : 'Not recorded'}</Badge></div> })}</CardContent></Card>)}
    </div>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="size-4" /> Governed local references</CardTitle><CardDescription>Record the provenance of a local spelling or grammar asset before it is imported. These records are audit metadata only: saving one does not enable it for review.</CardDescription></CardHeader><CardContent className="px-5"><form onSubmit={saveReference} className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="reference-language">Language</Label><NativeSelect id="reference-language" value={referenceForm.languageId} onChange={setReference('languageId')}>{catalog.languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="reference-type">Reference type</Label><NativeSelect id="reference-type" value={referenceForm.referenceType} onChange={setReference('referenceType')}><option value="spelling">Spelling dictionary</option><option value="grammar">Grammar reference</option></NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="source-name">Source name</Label><Input id="source-name" value={referenceForm.sourceName} onChange={setReference('sourceName')} placeholder="e.g. approved dictionary package" maxLength={255} required /></div>
      <div className="grid gap-2"><Label htmlFor="license">License</Label><Input id="license" value={referenceForm.license} onChange={setReference('license')} placeholder="e.g. license identifier or terms" maxLength={255} required /></div>
      <div className="grid gap-2"><Label htmlFor="version">Version</Label><Input id="version" value={referenceForm.version} onChange={setReference('version')} placeholder="Exact source version" maxLength={100} required /></div>
      <div className="grid gap-2"><Label htmlFor="source-reference">Source reference</Label><Input id="source-reference" value={referenceForm.sourceReference} onChange={setReference('sourceReference')} placeholder="Internal package or acquisition record" maxLength={500} required /></div>
      <div className="grid gap-2"><Label htmlFor="checksum">Checksum (optional)</Label><Input id="checksum" value={referenceForm.checksum} onChange={setReference('checksum')} placeholder="Integrity hash after local import" maxLength={128} /></div>
      <div className="grid gap-2"><Label htmlFor="review-state">Review state</Label><NativeSelect id="review-state" value={referenceForm.reviewState} onChange={setReference('reviewState')}><option value="planned">Planned</option><option value="reviewed">Reviewed</option><option value="approved">Approved</option></NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="validation-state">Validation state</Label><NativeSelect id="validation-state" value={referenceForm.validationState} onChange={setReference('validationState')}><option value="not-validated">Not validated</option><option value="verified">Verified</option></NativeSelect></div>
      <div className="flex flex-wrap items-end gap-2"><Button type="submit" disabled={savingReference}>{savingReference ? <Loader2 className="animate-spin" /> : editingId ? <Pencil /> : <Plus />}{savingReference ? 'Saving…' : editingId ? 'Save reference' : 'Record reference'}</Button>{editingId && <Button type="button" variant="outline" onClick={resetReference}>Cancel edit</Button>}</div>
    </form></CardContent></Card>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Reference register</CardTitle><CardDescription>{references.length ? `${references.length} governed ${references.length === 1 ? 'record' : 'records'}.` : 'No local language references have been recorded yet.'}</CardDescription></CardHeader>{references.length > 0 && <CardContent className="grid gap-3 px-5">{references.map((reference) => { const language = catalog.languages.find((item) => item.id === reference.languageId); return <div key={reference.id} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_auto]"><div className="grid gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{language?.name || reference.languageId} · {reference.referenceType === 'spelling' ? 'Spelling dictionary' : 'Grammar reference'}</p><Badge variant="outline">{reference.reviewState}</Badge><Badge variant="outline">{reference.validationState}</Badge></div><p className="text-sm text-muted-foreground">{reference.sourceName} · {reference.version} · {reference.license}</p><p className="text-xs text-muted-foreground">Reference: {reference.sourceReference}{reference.checksum ? ` · Checksum: ${reference.checksum}` : ''}</p></div><div className="flex items-start gap-2"><Button type="button" variant="outline" size="icon" onClick={() => editReference(reference)} title="Edit reference" aria-label="Edit reference"><Pencil /></Button><Button type="button" variant="outline" size="icon" onClick={() => removeReference(reference)} title="Remove reference" aria-label="Remove reference"><Trash2 /></Button></div></div> })}</CardContent>}</Card>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Next controlled phase</CardTitle><CardDescription>Reference assets will be imported into an approved local store, checksum-verified, and tested against language-specific fixtures before a validator can use them. No record on this page can enable an unverified source.</CardDescription></CardHeader></Card>
  </div>
}
