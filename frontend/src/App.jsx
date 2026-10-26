import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import EditorPage from '@/pages/EditorPage'
import ArticlesPage from '@/pages/ArticlesPage'
import ArticlesAnalyticsPage from '@/pages/ArticlesAnalyticsPage'
import LoginPage from '@/pages/LoginPage'
import SettingsPage from '@/pages/SettingsPage'
import ProtectedRoute from '@/components/ProtectedRoute'

// Dev-only tooling; excluded from production builds.
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ComponentsPage')) : null

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<EditorPage />} />
          <Route path="articles/analytics" element={<ArticlesAnalyticsPage />} />
          <Route path="articles/:id" element={<EditorPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {ComponentsPage && (
            <Route path="dev/components" element={<Suspense fallback={null}><ComponentsPage /></Suspense>} />
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
