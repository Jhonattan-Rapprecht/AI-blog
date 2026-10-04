import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Blocks, FileText, Moon, PenLine, Sparkles, Sun } from 'lucide-react'
import { Toaster } from 'sonner'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { useAIStatus } from '@/hooks/use-ai-status'

const nav = [
  { to: '/', label: 'New article', icon: PenLine, end: true },
  { to: '/articles', label: 'Articles', icon: FileText },
]

const devNav = import.meta.env.DEV ? [{ to: '/dev/components', label: 'Components', icon: Blocks }] : []

const groups = [
  { label: 'Content', items: nav },
  { label: 'Developer', items: devNav },
].filter((g) => g.items.length)

const titles = { '/': 'Editor', '/articles': 'Articles', '/dev/components': 'Components' }

export default function AppShell() {
  const { theme, toggle } = useTheme()
  const ai = useAIStatus()
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Editor'

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">AI Blog Studio</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ to, label, icon: Icon, end }) => (
                    <SidebarMenuItem key={to}>
                      <NavLink to={to} end={end}>
                        {({ isActive }) => (
                          <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                            <span><Icon /><span>{label}</span></span>
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center">
            <span className={`size-2 shrink-0 rounded-full ${ai.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="truncate group-data-[collapsible=icon]:hidden">{ai.label}</span>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-medium">{title}</h1>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </header>
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster theme={theme} position="bottom-right" richColors />
    </SidebarProvider>
  )
}

