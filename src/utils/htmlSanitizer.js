const sanitizeHtml = require('sanitize-html');

// These presentation classes are emitted by Quill. Keeping this explicit avoids
// permitting arbitrary CSS while preserving supported editor formatting.
const QUILL_CLASSES = [
    'ql-align-left', 'ql-align-center', 'ql-align-right', 'ql-align-justify',
    'ql-direction-rtl',
    ...Array.from({ length: 8 }, (_, index) => `ql-indent-${index + 1}`),
    'ql-code-block', 'ql-code-block-container'
];

const isSafeImageSource = (source) => {
    if (!source || /^data:/i.test(source)) return false;
    try {
        const url = new URL(source, 'https://blogstudio.invalid');
        return ['http:', 'https:'].includes(url.protocol) && !/\.svg$/i.test(url.pathname);
    } catch {
        return false;
    }
};

const sanitizerOptions = {
    allowedTags: [
        'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'div',
        'a', 'img',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col'
    ],
    allowedAttributes: {
        a: ['href', 'target', 'rel', 'title'],
        img: ['src', 'alt', 'width', 'height', 'loading'],
        th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], col: ['span'],
        div: ['class', 'data-language'],
        p: ['class'], h1: ['class'], h2: ['class'], h3: ['class'], h4: ['class'], h5: ['class'], h6: ['class'],
        span: ['class'], ul: ['class'], ol: ['class'], li: ['class'], blockquote: ['class'], pre: ['class']
    },
    allowedClasses: {
        div: QUILL_CLASSES,
        p: QUILL_CLASSES, h1: QUILL_CLASSES, h2: QUILL_CLASSES, h3: QUILL_CLASSES, h4: QUILL_CLASSES, h5: QUILL_CLASSES, h6: QUILL_CLASSES,
        span: QUILL_CLASSES, ul: QUILL_CLASSES, ol: QUILL_CLASSES, li: QUILL_CLASSES, blockquote: QUILL_CLASSES, pre: QUILL_CLASSES
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
        a: (tagName, attribs) => {
            if (attribs.target === '_blank') {
                const rel = new Set(String(attribs.rel || '').split(/\s+/).filter(Boolean));
                rel.add('noopener');
                rel.add('noreferrer');
                attribs.rel = [...rel].join(' ');
            } else {
                delete attribs.target;
            }
            return { tagName, attribs };
        }
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !isSafeImageSource(frame.attribs.src)
};

function sanitizeArticleHtml(html) {
    if (typeof html !== 'string') return '';
    return sanitizeHtml(html, sanitizerOptions);
}

module.exports = { sanitizeArticleHtml, QUILL_CLASSES };
