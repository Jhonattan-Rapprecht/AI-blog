const ATTRS: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly',
  maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete',
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule', 'clip-rule': 'clipRule',
}
const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'source', 'track', 'wbr'])
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

const styleObject = (css: string) =>
  `{{ ${css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [k, ...v] = d.split(':')
    return `${camel(k.trim())}: ${JSON.stringify(v.join(':').trim())}`
  }).join(', ')} }}`

function convert(node: Node, depth: number): string {
  const pad = '  '.repeat(depth)
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    return text ? pad + text.replace(/[{}<>]/g, (c) => `{'${c}'}`) : ''
  }
  if (node.nodeType === Node.COMMENT_NODE) return `${pad}{/* ${node.textContent?.trim()} */}`
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element
  const tag = el.localName
  if (tag === 'script' || tag === 'style') return ''

  const attrs = Array.from(el.attributes)
    .filter((a) => !a.name.startsWith('on'))
    .map((a) => {
      const name = ATTRS[a.name] ?? a.name
      if (a.name === 'style') return ` style=${styleObject(a.value)}`
      if (a.value === '') return ` ${name}`
      return ` ${name}=${a.value.includes('"') ? `{${JSON.stringify(a.value)}}` : `"${a.value}"`}`
    })
    .join('')

  const children = Array.from(el.childNodes).map((c) => convert(c, depth + 1)).filter(Boolean)
  if (VOID.has(tag) || children.length === 0) return `${pad}<${tag}${attrs} />`
  return `${pad}<${tag}${attrs}>\n${children.join('\n')}\n${pad}</${tag}>`
}

/** Converts an HTML snippet into a React function component (markup only; CSS is left as-is). */
export function htmlToJsx(html: string, componentName = 'Component'): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const roots = Array.from(doc.body.childNodes).map((n) => convert(n, 3)).filter(Boolean)
  const body = roots.length === 1
    ? roots[0].replace(/^ {2}/gm, '')
    : `    <>\n${roots.join('\n')}\n    </>`
  return `export function ${componentName}() {\n  return (\n${body}\n  )\n}\n`
}
