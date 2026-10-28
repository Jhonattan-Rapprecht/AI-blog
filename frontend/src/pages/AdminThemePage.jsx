import { MonitorCog, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/hooks/use-theme'

export default function AdminThemePage() {
  const { theme } = useTheme()
  const ThemeIcon = theme === 'dark' ? Moon : Sun
  return <div className="mx-auto grid max-w-4xl gap-6">
    <div><h2 className="text-lg font-semibold">Admin Theme</h2><p className="mt-1 text-sm text-muted-foreground">Control the Blogstudio administration interface only. Published article design is managed separately in Style & Appearance.</p></div>
    <Card className="gap-4 py-5"><CardHeader className="px-5"><CardTitle className="flex items-center gap-2 text-base"><MonitorCog className="size-4" /> Current interface preference</CardTitle><CardDescription>Your current preference is stored locally in this browser. Use the sun/moon control in the application header to switch it.</CardDescription></CardHeader><CardContent className="px-5"><div className="flex items-center gap-2 text-sm"><ThemeIcon className="size-4 text-muted-foreground" /> {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}</div></CardContent></Card>
    <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Theme foundation</CardTitle><CardDescription>Phase 5 will add system mode, validated accent tokens, sidebar options, and density preferences. These controls will remain isolated from Astro article layouts and style presets.</CardDescription></CardHeader></Card>
  </div>
}
