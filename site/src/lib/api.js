const API = import.meta.env.API_URL || 'http://localhost:3000/api/public';

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json();
}

export const listArticles = ({ page = 1, limit = 9, category, q } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  return get(`/articles?${params}`);
};

export const getArticle = (slug) => get(`/articles/${encodeURIComponent(slug)}`);
export const listCategories = () => get('/categories');

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

// Quill 2 serializes every space as &nbsp;, which prevents normal line wrapping.
export const normalizeHtml = (html = '') => html.replace(/&nbsp;|\u00A0/g, ' ');

export const readingTime = (html = '') => {
  const words = normalizeHtml(html).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};
