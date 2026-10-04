import axios from 'axios'
import { io } from 'socket.io-client'

const ORIGIN = 'http://localhost:3000'
const http = axios.create({ baseURL: `${ORIGIN}/api` })

export const socket = io(ORIGIN, { transports: ['websocket', 'polling'] })

export const errorMessage = (e) => e?.response?.data?.error || e?.message || 'Unknown error'

const strings = (list) => (Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s) : [])

export const api = {
  status: () => http.get('/ai/status').then((r) => r.data),
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
