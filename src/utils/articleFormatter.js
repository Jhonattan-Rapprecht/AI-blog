const BLOCK_TAGS = 'h[1-6]|p|ul|ol|li|blockquote|pre|table|hr';

const stripFences = (text) =>
    text.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');

const escapeText = (text) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plain text (no HTML) becomes paragraphs split on blank lines.
const wrapPlainText = (text) =>
    text
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => `<p>${escapeText(chunk).replace(/\n/g, '<br>')}</p>`)
        .join('');

const normalize = (html) =>
    html
        .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
        .replace(/<\/h1>/gi, '</h2>')
        .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
        .replace(new RegExp(`</(${BLOCK_TAGS})>`, 'gi'), '</$1>\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

// The article title is rendered separately, so drop a repeated leading heading.
const dropDuplicateTitle = (html, title) => {
    if (!title) return html;
    const match = html.match(/^<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*/i);
    if (!match) return html;
    const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return plain(match[1]) === plain(title) ? html.slice(match[0].length) : html;
};

function formatArticleContent(content, title) {
    if (typeof content !== 'string') return '';
    const text = stripFences(content.trim());
    const html = /<\/?[a-z][\s\S]*>/i.test(text) ? text : wrapPlainText(text);
    return dropDuplicateTitle(normalize(html), title);
}

module.exports = { formatArticleContent };
