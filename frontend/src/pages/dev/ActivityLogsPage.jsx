import { ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ActivityLogsPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <h2 className="text-lg font-semibold">System Activity Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review important activity across Blogstudio, including changes made by administrators and automated jobs.</p>
      </div>
      <Card>
        <CardContent className="grid justify-items-center gap-3 py-16 text-center">
          <ScrollText className="size-9 text-muted-foreground" />
          <p className="font-medium">Activity tracking is not set up yet</p>
          <p className="max-w-lg text-sm text-muted-foreground">This page is the starting point for system-wide audit logs. The event list, filters, retention rules, and database storage will be designed next.</p>
        </CardContent>
      </Card>
    </div>
  )
}
