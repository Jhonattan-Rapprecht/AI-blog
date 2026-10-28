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

// Metadata only. These IDs may map to trusted Astro components in a later phase;
// they never accept a database path, source string, or dynamic import.
const COMPONENT_REGISTRY = Object.freeze([
    { id: 'article-hero', name: 'Article Hero', category: 'article', regions: ['hero'], status: 'planned' },
    { id: 'article-meta', name: 'Article Metadata', category: 'article', regions: ['metadata'], status: 'planned' },
    { id: 'article-body', name: 'Article Body', category: 'article', regions: ['body'], status: 'planned' },
    { id: 'article-toc', name: 'Table of Contents', category: 'article', regions: ['sidebar'], status: 'planned' },
    { id: 'related-articles', name: 'Related Articles', category: 'article', regions: ['related'], status: 'planned' },
    { id: 'article-card', name: 'Article Card', category: 'layout', regions: ['related', 'featured-grid'], status: 'available' }
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

module.exports = { LAYOUTS, STYLE_PRESETS, COMPONENT_REGISTRY, DEFAULT_ARTICLE_DESIGN, validateArticleDesign, getArticleDesignCatalog };
