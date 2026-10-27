import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import EditorPage from '@/pages/EditorPage'
import ArticlesPage from '@/pages/ArticlesPage'
import ArticlesAnalyticsPage from '@/pages/ArticlesAnalyticsPage'
import LoginPage from '@/pages/LoginPage'
import SettingsPage from '@/pages/SettingsPage'
import MediaPage from '@/pages/MediaPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import { api } from '@/api/client'

// Dev-only tooling; excluded from production builds.
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ComponentsPage')) : null
const ActivityLogsPage = lazy(() => import('@/pages/ActivityLogsPage'))

function ClientErrorReporter() {
  useEffect(() => {
    const recentErrors = new Map()
    const report = (eventType, errorName, message, sourcePath = null, line = null, column = null) => {
      if (!localStorage.getItem('adminToken') || !message) return
      const clientPath = window.location.pathname
      const key = `${eventType}:${clientPath}:${message.slice(0, 160)}`
      const now = Date.now()
      if (now - (recentErrors.get(key) || 0) < 60000) return
      recentErrors.set(key, now)
      if (recentErrors.size > 100) recentErrors.delete(recentErrors.keys().next().value)
      api.reportClientError({ eventType, errorName, message: message.slice(0, 500), clientPath, sourcePath, line, column }).catch(() => {})
    }
    const onError = (event) => {
      let sourcePath = null
      if (event.filename) {
        try {
          const url = new URL(event.filename, window.location.href)
          if (url.origin !== window.location.origin) return
          sourcePath = url.pathname
        } catch { /* Keep the source path empty when it cannot be parsed safely. */ }
      }
      report('browser.uncaught_exception', event.error?.name || 'Error', event.message || event.error?.message || 'Uncaught browser error', sourcePath, event.lineno, event.colno)
    }
    const onRejection = (event) => {
      const reason = event.reason
      report('browser.unhandled_rejection', reason?.name || 'UnhandledRejection', reason?.message || String(reason || 'Unhandled promise rejection').slice(0, 500))
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ClientErrorReporter />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<EditorPage />} />
          <Route path="articles/analytics" element={<ArticlesAnalyticsPage />} />
          <Route path="articles/:id" element={<EditorPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {ComponentsPage && (
            <Route path="dev/components" element={<Suspense fallback={null}><ComponentsPage /></Suspense>} />
          )}
          <Route path="system/activity-logs" element={<Suspense fallback={null}><ActivityLogsPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
