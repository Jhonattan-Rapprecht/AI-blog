import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import EditorPage from '@/pages/EditorPage'
import ArticlesPage from '@/pages/ArticlesPage'

// Dev-only tooling; excluded from production builds.
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ComponentsPage')) : null

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<EditorPage />} />
          <Route path="articles/:id" element={<EditorPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          {ComponentsPage && (
            <Route path="dev/components" element={<Suspense fallback={null}><ComponentsPage /></Suspense>} />
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}