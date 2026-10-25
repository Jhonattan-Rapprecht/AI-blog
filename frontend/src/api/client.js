import axios from 'axios'
import { io } from 'socket.io-client'

const ORIGIN = 'http://localhost:3000'
const http = axios.create({ baseURL: `${ORIGIN}/api` })

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
  saveSettings: (settings) => http.put('/settings', settings).then((r) => r.data),
  categories: () => http.get('/categories').then((r) => r.data),
  addCategory: (name) => http.post('/categories', { name }),
  deleteCategory: (id) => http.delete(`/categories/${id}`),
  articles: () => http.get('/articles', { params: { limit: 100 } }).then((r) => r.data),
  article: (id) => http.get(`/articles/${id}`).then((r) => r.data),
  createArticle: (data) => http.post('/articles', data).then((r) => r.data),
  updateArticle: (id, data) => http.put(`/articles/${id}`, data).then((r) => r.data),
  deleteArticle: (id) => http.delete(`/articles/${id}`),
  generate: (config) => http.post('/ai/generate-article', config).then((r) => r.data),
  suggestTopics: () => http.post('/ai/suggest-topic').then((r) => strings(r.data.suggestions)),
  suggestSlugs: (title) => http.post('/ai/suggest-slug', { title }).then((r) => strings(r.data.suggestions)),
}
