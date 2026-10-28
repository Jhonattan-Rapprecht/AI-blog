import axios from 'axios'
import { io } from 'socket.io-client'

const ORIGIN = 'http://localhost:3000'
const http = axios.create({ baseURL: `${ORIGIN}/api` })
const reportedNetworkFailures = new Map()

export const socket = io(ORIGIN, { transports: ['websocket', 'polling'] })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Expired or invalid token: clear the session and go back to the login page
http.interceptors.response.use(
  (r) => r,
  (e) => {
    const isLogin = e.config?.url === '/auth/login'
    const isActivityReport = e.config?.url?.startsWith('/activity-logs/client-errors')
    if (!e.response && !isActivityReport && typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken')
      if (token) {
        let requestPath = ''
        try { requestPath = new URL(`${e.config?.baseURL || ORIGIN}${e.config?.url || ''}`, `${ORIGIN}/`).pathname } catch { /* omit unknown URL */ }
        const requestMethod = String(e.config?.method || 'get').toUpperCase()
        const key = `${requestMethod}:${requestPath}:${e.code || 'network'}`
        const now = Date.now()
        if (now - (reportedNetworkFailures.get(key) || 0) > 60000) {
          reportedNetworkFailures.set(key, now)
          if (reportedNetworkFailures.size > 100) reportedNetworkFailures.delete(reportedNetworkFailures.keys().next().value)
          fetch(`${ORIGIN}/api/activity-logs/client-errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ eventType: 'browser.api_connection_error', errorName: e.code || 'NetworkError', message: 'Admin browser could not reach the API.', clientPath: window.location.pathname, requestPath, requestMethod }),
          }).catch(() => {})
        }
      }
    }
    if (e.response?.status === 401 && !isLogin) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(e)
  },
)

export const errorMessage = (e) => e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Unknown error'

const strings = (list) => (Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s) : [])

export const api = {
  login: (username, password) => http.post('/auth/login', { username, password }).then((r) => r.data),
  status: () => http.get('/ai/status').then((r) => r.data),
  settings: () => http.get('/settings').then((r) => r.data),
  articleDesignCatalog: () => http.get('/article-design/catalog').then((r) => r.data),
  saveSettings: (settings) => http.put('/settings', settings).then((r) => r.data),
  checkModel: (model) => http.post('/settings/check-model', { model }).then((r) => r.data),
  categories: () => http.get('/categories').then((r) => r.data),
  addCategory: (name) => http.post('/categories', { name }),
  deleteCategory: (id) => http.delete(`/categories/${id}`),
  articles: ({ limit = 24, offset = 0, sortBy = 'created_at', direction = 'desc' } = {}) => http.get('/articles', { params: { limit, offset, sortBy, direction } }).then((r) => r.data),
  articleAnalytics: (days = 30) => http.get('/analytics/overview', { params: { days } }).then((r) => r.data),
  activityReports: (params) => http.get('/activity-logs/reports', { params }).then((r) => r.data),
  exportActivityReport: (params, format = 'xlsx') => http.get('/activity-logs/reports/export', { params: { ...params, format }, responseType: 'blob' }).then((r) => r.data),
  reportClientError: (data) => http.post('/activity-logs/client-errors', data),
  article: (id) => http.get(`/articles/${id}`).then((r) => r.data),
  createArticle: (data) => http.post('/articles', data).then((r) => r.data),
  updateArticle: (id, data) => http.put(`/articles/${id}`, data).then((r) => r.data),
  deleteArticle: (id) => http.delete(`/articles/${id}`),
  media: (type = 'image') => http.get('/media', { params: { type } }).then((r) => r.data),
  uploadMedia: (file) => http.post(`/media/upload?filename=${encodeURIComponent(file.name)}`, file, { headers: { 'Content-Type': file.type }, timeout: file.type.startsWith('video/') ? 300000 : 60000 }).then((r) => r.data),
  addVideoLink: (data) => http.post('/media/video-link', data).then((r) => r.data),
  updateMedia: (id, data) => http.put(`/media/${id}`, data).then((r) => r.data),
  deleteMedia: (id) => http.delete(`/media/${id}`),
  generate: (config) => http.post('/ai/generate-article', config).then((r) => r.data),
  suggestTopics: (context) => http.post('/ai/suggest-topic', context).then((r) => strings(r.data.suggestions)),
  suggestSlugs: (title) => http.post('/ai/suggest-slug', { title }).then((r) => strings(r.data.suggestions)),
  suggestTitles: (context) => http.post('/ai/suggest-title', context, { timeout: 120000 }).then((r) => strings(r.data.suggestions)),
  reviewArticle: (article) => http.post('/ai/review-article', article, { timeout: 300000 }).then((r) => r.data),
  factCheckArticle: (article) => http.post('/ai/fact-check-article', article, { timeout: 120000 }).then((r) => r.data),
  grammarCheckArticle: (article) => http.post('/ai/grammar-check-article', article, { timeout: 120000 }).then((r) => r.data),
  factCheckSelection: (selection) => http.post('/ai/fact-check-selection', selection, { timeout: 120000 }).then((r) => r.data),
  grammarCheckSelection: (selection) => http.post('/ai/grammar-check-selection', selection, { timeout: 120000 }).then((r) => r.data),
  checkExcerpt: (data) => http.post('/ai/check-excerpt', data, { timeout: 120000 }).then((r) => r.data),
  checkTitle: (data) => http.post('/ai/check-title', data, { timeout: 120000 }).then((r) => r.data),
  spellcheckArticle: (article) => http.post('/ai/spellcheck-article', article, { timeout: 120000 }).then((r) => r.data),
  articleReviewHistory: (articleId) => http.get(`/ai/review-history/${articleId}`).then((r) => r.data),
  saveArticleReviewHistory: (articleId, review) => http.post(`/ai/review-history/${articleId}`, review).then((r) => r.data),
  updateReviewFinding: (findingId, data) => http.patch(`/ai/review-findings/${findingId}`, data).then((r) => r.data),
}

export const mediaUrl = (filepath) => {
  if (!filepath) return ''
  if (/^(?:https?:)?\/\//i.test(filepath) || filepath.startsWith('data:')) return filepath
  return `${ORIGIN}${filepath.startsWith('/') ? filepath : `/${filepath}`}`
}
