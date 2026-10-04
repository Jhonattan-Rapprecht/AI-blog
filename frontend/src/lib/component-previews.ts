export interface ComponentPreview {
  slug: string
  name: string
  html: string
  css: string
  hasCss: boolean
}

const ROOT = '/src/component-previews/'
const htmlFiles = import.meta.glob<string>('/src/component-previews/**/*.html', { query: '?raw', import: 'default', eager: true })
const cssFiles = import.meta.glob<string>('/src/component-previews/**/*.css', { query: '?raw', import: 'default', eager: true })

const toName = (slug: string) =>
  slug.split('/').pop()!.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** HTML files in src/component-previews/, paired with a same-named .css file when present. */
export const previews: ComponentPreview[] = Object.entries(htmlFiles)
  .map(([path, html]) => {
    const key = path.replace(/\.html$/, '')
    const css = cssFiles[`${key}.css`]
    const slug = key.replace(ROOT, '')
    return { slug, name: toName(slug), html, css: css ?? '', hasCss: css !== undefined }
  })
  .sort((a, b) => a.name.localeCompare(b.name))
