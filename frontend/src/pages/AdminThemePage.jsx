import { CircleDotDashed, LayoutPanelTop, MonitorCog, Moon, MousePointer2, PanelsTopLeft, Sun, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useAdminAppearance } from '@/hooks/use-admin-appearance'
import { useTheme } from '@/hooks/use-theme'

function Setting({ label, description, children }) {
  return <div className="grid gap-2 border-t pt-4 first:border-t-0 first:pt-0"><div className="grid gap-0.5"><Label className="text-sm">{label}</Label><p className="text-xs text-muted-foreground">{description}</p></div>{children}</div>
}

export default function AdminThemePage() {
  const { theme } = useTheme()
  const { appearance, updateAppearance } = useAdminAppearance()
  const ThemeIcon = theme === 'dark' ? Moon : Sun
  const setAppearance = (key) => (event) => updateAppearance({ [key]: event.target.value })

  return <div className="mx-auto grid max-w-4xl gap-6">
    <div><h2 className="text-lg font-semibold">Admin Theme</h2><p className="mt-1 text-sm text-muted-foreground">Configure this browser’s Blogstudio workspace. These preferences never change published article layouts or public-site styling.</p></div>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><MonitorCog className="size-4" /> Interface mode</CardTitle><CardDescription>Your light or dark preference is stored locally. Use the sun/moon control in the application header to switch it.</CardDescription></CardHeader><CardContent className="px-5"><div className="flex items-center gap-2 text-sm"><ThemeIcon className="size-4 text-muted-foreground" /> {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}</div></CardContent></Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><LayoutPanelTop className="size-4" /> Layout & navigation</CardTitle><CardDescription>Blogstudio’s familiar shell stays stable while future layout choices are introduced deliberately.</CardDescription></CardHeader><CardContent className="grid gap-4 px-5"><Setting label="Application shell" description="Sidebar navigation, header position, and dashboard spacing currently follow the standard Blogstudio layout."><div className="flex items-center gap-2 text-sm text-muted-foreground"><PanelsTopLeft className="size-4" /> Standard workspace layout</div></Setting><Setting label="Content density" description="Density controls are planned so they can be tested across tables, forms, and mobile views."><span className="text-sm text-muted-foreground">Comfortable density (current standard)</span></Setting></CardContent></Card>
      <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><MousePointer2 className="size-4" /> Elements & feedback</CardTitle><CardDescription>Core buttons, cards, status colors, and focus states continue using the current accessible design tokens.</CardDescription></CardHeader><CardContent className="grid gap-4 px-5"><Setting label="Interactive elements" description="The existing primary, secondary, and destructive control styles remain the active system."><span className="text-sm text-muted-foreground">Current Blogstudio element system</span></Setting><Setting label="Attention feedback" description="Review-result attention is the first configurable feedback effect. It pauses smoothly once the panel is hovered or focused."><span className="text-sm text-muted-foreground">Controlled in Effects & animations</span></Setting></CardContent></Card>
    </div>

    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><WandSparkles className="size-4" /> Effects & animations</CardTitle><CardDescription>Subtle attention cues help surface unresolved review suggestions. Settings apply locally to the administration interface and automatically respect reduced-motion preferences.</CardDescription></CardHeader><CardContent className="grid gap-5 px-5 md:grid-cols-2"><Setting label="Unresolved review attention" description="Pulse the Review results panel only while it contains an unresolved suggestion. Hovering or keyboard focus fades the effect out."><Button type="button" variant={appearance.reviewAttentionEnabled ? 'secondary' : 'outline'} className="w-fit" onClick={() => updateAppearance({ reviewAttentionEnabled: !appearance.reviewAttentionEnabled })}><CircleDotDashed className={appearance.reviewAttentionEnabled ? 'animate-pulse' : ''} /> {appearance.reviewAttentionEnabled ? 'Enabled' : 'Disabled'}</Button></Setting><Setting label="Pulse color" description="Uses a safe interface accent, not an arbitrary color value."><NativeSelect value={appearance.reviewAttentionColor} onChange={setAppearance('reviewAttentionColor')}><option value="violet">Violet</option><option value="blue">Blue</option><option value="emerald">Emerald</option></NativeSelect></Setting><Setting label="Intensity" description="Controls the opacity and soft glow radius."><NativeSelect value={appearance.reviewAttentionIntensity} onChange={setAppearance('reviewAttentionIntensity')}><option value="subtle">Subtle</option><option value="noticeable">Noticeable</option></NativeSelect></Setting><Setting label="Pulse speed" description="Controls how quickly the attention cue repeats."><NativeSelect value={appearance.reviewAttentionSpeed} onChange={setAppearance('reviewAttentionSpeed')}><option value="calm">Calm</option><option value="steady">Steady</option><option value="lively">Lively</option></NativeSelect></Setting></CardContent></Card>
  </div>
}
