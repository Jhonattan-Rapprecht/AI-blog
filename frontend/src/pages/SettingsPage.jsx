import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, RefreshCw, Server, SlidersHorizontal, Sparkles } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

const INITIAL = { model: '', language: 'English', tone: 'Professional', audience: 'General', articleLength: 'Medium' }
const TONES = ['Professional', 'Conversational', 'Technical', 'Opinionated']
const LENGTHS = ['Short', 'Medium', 'Long']
const LANGUAGES = ['English', 'Dutch', 'Spanish', 'French', 'German']

function SettingField({ label, hint, children }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(INITIAL)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [online, setOnline] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.settings()
      setSettings({ model: data.model, language: data.language, tone: data.tone, audience: data.audience, articleLength: data.articleLength })
      setModels(data.models || [])
      setOnline(!!data.connected)
    } catch (error) {
      setOnline(false)
      toast.error(errorMessage(error))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = (key) => (event) => setSettings((current) => ({ ...current, [key]: event.target.value }))
  const save = async () => {
    setSaving(true)
    try {
      const data = await api.saveSettings(settings)
      setSettings({ model: data.model, language: data.language, tone: data.tone, audience: data.audience, articleLength: data.articleLength })
      setModels(data.models || [])
      toast.success('Settings saved')
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setSaving(false) }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Settings</h2><p className="mt-1 text-sm text-muted-foreground">Configure the AI model and defaults used when creating articles.</p></div>
        <Button onClick={save} disabled={loading || saving}>{saving ? <Loader2 className="animate-spin" /> : <Check />} Save changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Server className="size-4" /> AI connection</CardTitle>
          <CardDescription>Choose a model already installed in your local Ollama library.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />{loading ? 'Checking Ollama…' : online ? 'Ollama is reachable' : 'Ollama is unavailable'}<Badge variant="outline">Local</Badge></div>
          <SettingField label="Ollama model" hint="This model will be used for article generation, topic ideas, and slug suggestions.">
            <div className="flex gap-2">
              <NativeSelect value={settings.model} onChange={set('model')} disabled={loading || !models.length}>
                {!models.length && <option value="">No Ollama models found</option>}
                {models.map((model) => <option key={model} value={model}>{model}</option>)}
              </NativeSelect>
              <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh installed models"><RefreshCw className={loading ? 'animate-spin' : ''} /></Button>
            </div>
          </SettingField>
          {models.length > 0 && <p className="text-xs text-muted-foreground">{models.length} installed models available</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="size-4" /> Writing defaults</CardTitle>
          <CardDescription>These values prefill the AI generation controls in the Editor. You can still change them per article.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <SettingField label="Default language"><NativeSelect value={settings.language} onChange={set('language')}>{LANGUAGES.map((x) => <option key={x}>{x}</option>)}</NativeSelect></SettingField>
          <SettingField label="Default tone"><NativeSelect value={settings.tone} onChange={set('tone')}>{TONES.map((x) => <option key={x}>{x}</option>)}</NativeSelect></SettingField>
          <SettingField label="Default audience" hint="This value will be available in the Editor's audience selector."><NativeSelect value={settings.audience} onChange={set('audience')}>
            {Array.from(new Set([settings.audience, 'General', 'Technical', 'Business', 'Beginners', 'Experts'])).map((x) => <option key={x}>{x}</option>)}
          </NativeSelect></SettingField>
          <SettingField label="Default article length"><NativeSelect value={settings.articleLength} onChange={set('articleLength')}>{LENGTHS.map((x) => <option key={x}>{x}</option>)}</NativeSelect></SettingField>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={loading || saving}>{saving ? <Loader2 className="animate-spin" /> : <Sparkles />} Save settings</Button></div>
    </div>
  )
}
