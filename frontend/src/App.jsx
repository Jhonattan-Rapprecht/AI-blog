import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import EditorPage from '@/pages/EditorPage'
import ArticlesPage from '@/pages/ArticlesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<EditorPage />} />
          <Route path="articles/:id" element={<EditorPage />} />
          <Route path="articles" element={<ArticlesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
