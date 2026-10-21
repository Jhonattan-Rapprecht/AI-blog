import fs from 'node:fs/promises'
import path from 'node:path'

const ENDPOINT = '/__component-previews'
const MAX_BYTES = 1024 * 1024
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BYTES) { reject(new Error('Payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })

const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

// Dev-only: lets the Components page save pasted snippets into src/component-previews/.
export default function componentPreviewsPlugin() {
  let dir
  return {
    name: 'component-previews-writer',
    apply: 'serve',
    configResolved(config) {
      dir = path.resolve(config.root, 'src/component-previews')
    },
    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

        // Block cross-site requests: only the dev server's own pages may write files.
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'Forbidden origin' })
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
          return send(res, 415, { error: 'Expected JSON' })
        }

        try {
          const { slug, html, css } = await readJson(req)
          if (typeof slug !== 'string' || !SLUG.test(slug)) return send(res, 400, { error: 'Invalid name' })
          if (typeof html !== 'string' || !html.trim()) return send(res, 400, { error: 'HTML is required' })

          await fs.mkdir(dir, { recursive: true })
          try {
            await fs.writeFile(path.join(dir, `${slug}.html`), html, { flag: 'wx' })
          } catch (e) {
            if (e.code === 'EEXIST') return send(res, 409, { error: `"${slug}" already exists` })
            throw e
          }
          if (typeof css === 'string' && css.trim()) await fs.writeFile(path.join(dir, `${slug}.css`), css)
          send(res, 200, { slug })
        } catch (e) {
          send(res, 400, { error: e.message })
        }
      })
    },
  }
}
