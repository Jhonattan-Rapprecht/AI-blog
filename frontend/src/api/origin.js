export function resolveApiOrigin(value, development = false) {
  const configuredOrigin = String(value || '').trim()
  if (!configuredOrigin) return development ? 'http://localhost:3000' : ''
  let url
  try { url = new URL(configuredOrigin) } catch { throw new Error('VITE_API_ORIGIN must be an absolute HTTP(S) origin.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_API_ORIGIN must be a plain HTTP(S) origin without credentials, paths, queries, or fragments.')
  }
  return url.origin
}
