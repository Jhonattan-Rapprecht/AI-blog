const LAYOUTS = Object.freeze([
    { id: 'classic', name: 'Classic Editorial', description: 'Centered reading column with a traditional editorial hierarchy.', regions: ['hero', 'metadata', 'body', 'related'] },
    { id: 'split', name: 'Magazine Split', description: 'Headline and excerpt alongside a featured image, stacking cleanly on mobile.', regions: ['hero', 'metadata', 'body', 'sidebar', 'related'] },
    { id: 'immersive', name: 'Immersive Feature', description: 'Cinematic full-width hero with an editorial reading experience.', regions: ['hero', 'metadata', 'body', 'wide-content', 'related'] }
]);

const STYLE_PRESETS = Object.freeze([
    { id: 'minimal-news', name: 'Minimal News', description: 'Clear hierarchy and restrained editorial color.' },
    { id: 'luxury-editorial', name: 'Luxury Editorial', description: 'Refined contrast and spacious typography.' },
    { id: 'brutalist-magazine', name: 'Brutalist Magazine', description: 'Bold structure and assertive visual rhythm.' },
    { id: 'cyberpunk-technology', name: 'Cyberpunk Technology', description: 'Dark technology-forward palette with vivid accents.' }
]);

// Each identifier maps to fixed CSS variables in the Astro stylesheet. Values
// are metadata only; no user supplied CSS, URL, or raw font-family is emitted.
const STYLE_PRESET_TOKENS = Object.freeze({
    'minimal-news': { palette: 'minimal-news', typography: { headlineFont: 'newsreader', headingFont: 'newsreader', bodyFont: 'inter', metaFont: 'inter', headlineScale: 'standard', bodySize: 'comfortable', lineHeight: 'relaxed', letterSpacing: 'normal', fontWeight: 'regular' }, imageTreatment: 'standard' },
    'luxury-editorial': { palette: 'luxury-editorial', typography: { headlineFont: 'newsreader', headingFont: 'newsreader', bodyFont: 'newsreader', metaFont: 'inter', headlineScale: 'large', bodySize: 'comfortable', lineHeight: 'airy', letterSpacing: 'normal', fontWeight: 'regular' }, imageTreatment: 'framed' },
    'brutalist-magazine': { palette: 'brutalist-magazine', typography: { headlineFont: 'inter', headingFont: 'inter', bodyFont: 'inter', metaFont: 'inter', headlineScale: 'display', bodySize: 'comfortable', lineHeight: 'normal', letterSpacing: 'tight', fontWeight: 'bold' }, imageTreatment: 'edge-to-edge' },
    'cyberpunk-technology': { palette: 'cyberpunk-technology', typography: { headlineFont: 'inter', headingFont: 'inter', bodyFont: 'inter', metaFont: 'monospace', headlineScale: 'large', bodySize: 'comfortable', lineHeight: 'relaxed', letterSpacing: 'normal', fontWeight: 'medium' }, imageTreatment: 'cinematic' }
});

// Metadata only. Registered entries map to version-controlled, statically imported
// Astro implementations. This catalog never accepts a database path, source string,
// dynamic import, or executable configuration.
const COMPONENT_REGISTRY = Object.freeze([
    { id: 'article-hero', name: 'Article Hero', category: 'article', description: 'Featured article image and its accessible fallback.', variants: ['standard', 'split', 'overlay'], regions: ['hero'], properties: ['article', 'image treatment'], status: 'planned', preview: 'static' },
    { id: 'article-title', name: 'Article Title', category: 'article', description: 'Primary editorial heading for the article.', variants: ['standard', 'display'], regions: ['hero', 'metadata'], properties: ['article title'], status: 'planned', preview: 'static' },
    { id: 'article-meta', name: 'Article Metadata', category: 'article', description: 'Category, publication date, and reading time.', variants: ['standard', 'overlay'], regions: ['metadata'], properties: ['category', 'published date', 'reading time'], status: 'planned', preview: 'static' },
    { id: 'article-body', name: 'Article Body', category: 'article', description: 'Sanitized rich article HTML in an approved reading region.', variants: ['standard', 'feature'], regions: ['body', 'wide-content'], properties: ['sanitized article HTML'], status: 'planned', preview: 'static' },
    { id: 'author-card', name: 'Author Card', category: 'article', description: 'Reserved authored-byline card for future author profiles.', variants: ['compact', 'full'], regions: ['metadata', 'related'], properties: ['author profile'], status: 'planned', preview: 'static' },
    { id: 'article-toc', name: 'Table of Contents', category: 'article', description: 'Heading navigation generated from approved article content.', variants: ['rail', 'mobile'], regions: ['sidebar'], properties: ['heading list'], status: 'planned', preview: 'static' },
    { id: 'related-articles', name: 'Related Articles', category: 'article', description: 'Continuation links for related published articles.', variants: ['grid', 'rail'], regions: ['related'], properties: ['related articles'], status: 'planned', preview: 'static' },
    { id: 'pull-quote', name: 'Pull Quote', category: 'editorial', description: 'Editorial emphasis for a short quoted passage.', variants: ['standard', 'accent'], regions: ['body', 'wide-content'], properties: ['quote', 'attribution'], status: 'planned', preview: 'static' },
    { id: 'image-gallery', name: 'Image Gallery', category: 'editorial', description: 'Curated gallery of approved media-library images.', variants: ['grid', 'carousel'], regions: ['body', 'wide-content'], properties: ['media items', 'captions'], status: 'planned', preview: 'static' },
    { id: 'image-caption', name: 'Image With Caption', category: 'editorial', description: 'Editorial image treatment with credit and caption.', variants: ['standard', 'wide'], regions: ['body', 'wide-content'], properties: ['image', 'caption', 'credit'], status: 'planned', preview: 'static' },
    { id: 'editorial-callout', name: 'Editorial Callout', category: 'editorial', description: 'Contextual note with a restrained visual treatment.', variants: ['note', 'warning', 'tip'], regions: ['body'], properties: ['title', 'content'], status: 'planned', preview: 'static' },
    { id: 'highlight-box', name: 'Highlight Box', category: 'editorial', description: 'Short emphasis block for a key editorial point.', variants: ['accent', 'muted'], regions: ['body'], properties: ['content'], status: 'planned', preview: 'static' },
    { id: 'section-divider', name: 'Section Divider', category: 'editorial', description: 'Visual separation between long-form article sections.', variants: ['line', 'ornament'], regions: ['body', 'wide-content'], properties: [], status: 'planned', preview: 'static' },
    { id: 'comparison-table', name: 'Comparison Table', category: 'editorial', description: 'Structured comparison using the safe article table markup.', variants: ['standard', 'striped'], regions: ['body', 'wide-content'], properties: ['columns', 'rows'], status: 'planned', preview: 'static' },
    { id: 'classic-editorial-layout', name: 'Classic Editorial', category: 'layout', description: 'The preserved production article layout.', variants: ['classic'], regions: ['hero', 'metadata', 'body', 'related'], properties: ['article', 'table of contents', 'related articles'], status: 'registered', preview: 'static' },
    { id: 'magazine-split-layout', name: 'Magazine Split', category: 'layout', description: 'Trusted Astro layout with a split editorial hero.', variants: ['split'], regions: ['hero', 'metadata', 'body', 'sidebar', 'related'], properties: ['article', 'table of contents', 'related articles'], status: 'registered', preview: 'static' },
    { id: 'immersive-feature-layout', name: 'Immersive Feature', category: 'layout', description: 'Trusted Astro layout with a cinematic feature hero.', variants: ['immersive'], regions: ['hero', 'metadata', 'body', 'wide-content', 'related'], properties: ['article', 'table of contents', 'related articles'], status: 'registered', preview: 'static' },
    { id: 'full-width-hero', name: 'Full-width Hero', category: 'layout', description: 'Reusable hero-region pattern for future layouts.', variants: ['image', 'overlay'], regions: ['hero'], properties: ['article', 'image'], status: 'planned', preview: 'static' },
    { id: 'split-hero', name: 'Split Hero', category: 'layout', description: 'Reusable side-by-side hero-region pattern.', variants: ['image-right', 'image-left'], regions: ['hero'], properties: ['article', 'image'], status: 'planned', preview: 'static' },
    { id: 'reading-column', name: 'Reading Column', category: 'layout', description: 'Long-form content column with controlled measure.', variants: ['standard', 'wide'], regions: ['body', 'wide-content'], properties: ['content'], status: 'planned', preview: 'static' },
    { id: 'sidebar-region', name: 'Sidebar Region', category: 'layout', description: 'Supporting region for contents and contextual modules.', variants: ['toc', 'related'], regions: ['sidebar'], properties: ['modules'], status: 'planned', preview: 'static' },
    { id: 'two-column-section', name: 'Two-column Section', category: 'layout', description: 'Future editorial body section with two content columns.', variants: ['equal', 'content-aside'], regions: ['body', 'wide-content'], properties: ['left content', 'right content'], status: 'planned', preview: 'static' },
    { id: 'article-card', name: 'Article Card', category: 'layout', description: 'Trusted Astro card for related and listing articles.', variants: ['standard', 'featured', 'list'], regions: ['related', 'featured-grid'], properties: ['article', 'featured'], status: 'registered', preview: 'static' },
    { id: 'editorial-header', name: 'Editorial Header', category: 'layout', description: 'Future publication-level heading composition.', variants: ['standard', 'compact'], regions: ['hero', 'metadata'], properties: ['title', 'metadata'], status: 'planned', preview: 'static' }
]);

const DEFAULT_ARTICLE_DESIGN = Object.freeze({
    version: 1,
    layout: 'classic',
    stylePreset: 'minimal-news',
    typography: { headingFont: 'newsreader', bodyFont: 'inter', headingScale: 'standard', bodySize: 'comfortable', lineHeight: 'relaxed', dropCap: false },
    colors: { background: 'default', text: 'default', accent: 'violet' },
    imageTreatment: { hero: 'standard', radius: 'medium', aspectRatio: 'original' },
    components: { hero: 'article-hero', metadata: 'article-meta', body: 'article-body', related: 'related-articles' }
});

const allowedValues = {
    headingFont: ['newsreader', 'inter'], bodyFont: ['inter', 'newsreader'], headingScale: ['compact', 'standard', 'display'],
    bodySize: ['compact', 'comfortable', 'spacious'], lineHeight: ['normal', 'relaxed', 'airy'],
    background: ['default', 'paper', 'ink'], text: ['default', 'inverse'], accent: ['violet', 'blue', 'red', 'gold'],
    hero: ['standard', 'split', 'cinematic'], radius: ['none', 'small', 'medium', 'large'], aspectRatio: ['original', 'landscape', 'portrait', 'square']
};
const styleAllowedValues = {
    headlineFont: ['newsreader', 'inter', 'monospace'], headingFont: ['newsreader', 'inter', 'monospace'], bodyFont: ['newsreader', 'inter', 'monospace'], metaFont: ['inter', 'newsreader', 'monospace'],
    headlineScale: ['standard', 'large', 'display'], bodySize: ['compact', 'comfortable', 'spacious'], lineHeight: ['normal', 'relaxed', 'airy'], letterSpacing: ['tight', 'normal', 'wide'], fontWeight: ['regular', 'medium', 'bold'], imageTreatment: ['standard', 'rounded', 'edge-to-edge', 'framed', 'cinematic']
};

const ids = (items) => new Set(items.map((item) => item.id));
const layoutIds = ids(LAYOUTS);
const presetIds = ids(STYLE_PRESETS);
const componentById = new Map(COMPONENT_REGISTRY.map((component) => [component.id, component]));
const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_ARTICLE_DESIGN));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function choose(errors, source, key, accepted, fallback, path) {
    if (!own(source, key)) return fallback;
    if (accepted.includes(source[key])) return source[key];
    errors.push(`${path} must be an approved value.`);
    return fallback;
}

function validateArticleDesign(input = {}) {
    const errors = [];
    const design = cloneDefault();
    const source = object(input);

    design.layout = choose(errors, source, 'layout', [...layoutIds], design.layout, 'layout');
    design.stylePreset = choose(errors, source, 'stylePreset', [...presetIds], design.stylePreset, 'stylePreset');
    const typography = object(source.typography);
    for (const key of Object.keys(design.typography)) {
        if (key === 'dropCap') {
            if (own(typography, key) && typeof typography[key] !== 'boolean') errors.push('typography.dropCap must be true or false.');
            else if (own(typography, key)) design.typography[key] = typography[key];
        } else design.typography[key] = choose(errors, typography, key, allowedValues[key], design.typography[key], `typography.${key}`);
    }
    const colors = object(source.colors);
    for (const key of Object.keys(design.colors)) design.colors[key] = choose(errors, colors, key, allowedValues[key], design.colors[key], `colors.${key}`);
    const imageTreatment = object(source.imageTreatment);
    for (const key of Object.keys(design.imageTreatment)) design.imageTreatment[key] = choose(errors, imageTreatment, key, allowedValues[key], design.imageTreatment[key], `imageTreatment.${key}`);

    const layout = LAYOUTS.find((item) => item.id === design.layout);
    const components = object(source.components);
    for (const [region, fallback] of Object.entries(design.components)) {
        if (!own(components, region)) continue;
        const candidate = componentById.get(components[region]);
        if (candidate && candidate.regions.includes(region) && layout.regions.includes(region)) design.components[region] = candidate.id;
        else errors.push(`components.${region} is not approved for the ${region} region.`);
    }

    return { value: design, errors };
}

function getArticleDesignCatalog() {
    return { layouts: LAYOUTS, stylePresets: STYLE_PRESETS, components: COMPONENT_REGISTRY, defaultDesign: cloneDefault() };
}

function normalizeLayoutSelection(input) {
    const layout = typeof input === 'string' ? input : input?.layout;
    return layoutIds.has(layout) ? { layout } : null;
}

function normalizeStyleSelection(input = {}) {
    const source = object(input);
    const errors = [];
    const preset = presetIds.has(source.stylePreset) ? source.stylePreset : null;
    if (!preset) errors.push('Choose an approved style preset.');
    const typography = object(source.typography);
    const normalizedTypography = {};
    for (const key of Object.keys(styleAllowedValues).filter((key) => key !== 'imageTreatment')) {
        if (typography[key] === undefined) continue;
        if (styleAllowedValues[key].includes(typography[key])) normalizedTypography[key] = typography[key];
        else errors.push(`typography.${key} must be an approved value.`);
    }
    const imageTreatment = source.imageTreatment;
    if (imageTreatment !== undefined && !styleAllowedValues.imageTreatment.includes(imageTreatment)) errors.push('imageTreatment must be an approved value.');
    if (errors.length) return { value: null, errors };
    return { value: { stylePreset: preset, typography: normalizedTypography, imageTreatment: imageTreatment || null }, errors };
}

// Phase 2 persists only layout selection. Styling tokens remain a later phase, so
// stored data can never enable arbitrary CSS or component imports.
function resolveArticleDesign(publicationSelection, articleSelection) {
    const publication = normalizeLayoutSelection(publicationSelection);
    const article = normalizeLayoutSelection(articleSelection);
    const design = cloneDefault();
    design.layout = article?.layout || publication?.layout || design.layout;
    const publicationStyle = normalizeStyleSelection(publicationSelection).value;
    const articleStyle = normalizeStyleSelection(articleSelection).value;
    const effectiveStyle = articleStyle || publicationStyle;
    if (effectiveStyle) {
        const preset = STYLE_PRESET_TOKENS[effectiveStyle.stylePreset];
        design.stylePreset = effectiveStyle.stylePreset;
        design.typography = { ...preset.typography, ...effectiveStyle.typography };
        design.imageTreatment = { ...design.imageTreatment, hero: effectiveStyle.imageTreatment || preset.imageTreatment };
    }
    design.styleSource = articleStyle ? 'article' : publicationStyle ? 'publication' : 'fallback';
    return design;
}

module.exports = {
    LAYOUTS,
    STYLE_PRESETS,
    STYLE_PRESET_TOKENS,
    COMPONENT_REGISTRY,
    DEFAULT_ARTICLE_DESIGN,
    validateArticleDesign,
    getArticleDesignCatalog,
    normalizeLayoutSelection,
    normalizeStyleSelection,
    resolveArticleDesign
};
