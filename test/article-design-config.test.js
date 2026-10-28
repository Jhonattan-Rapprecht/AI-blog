const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    DEFAULT_ARTICLE_DESIGN,
    getArticleDesignCatalog,
    normalizeLayoutSelection,
    resolveArticleDesign,
    normalizeStyleSelection,
    validateArticleDesign
} = require('../src/config/article-design.config');

test('article design defaults resolve to the safe classic editorial configuration', () => {
    const result = validateArticleDesign();
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.value, DEFAULT_ARTICLE_DESIGN);
    assert.notEqual(result.value, DEFAULT_ARTICLE_DESIGN);
    assert.equal(result.value.layout, 'classic');
    assert.equal(result.value.stylePreset, 'minimal-news');
});

test('article design accepts only approved layout, style, token, and region component values', () => {
    const result = validateArticleDesign({
        layout: 'split',
        stylePreset: 'cyberpunk-technology',
        typography: { headingFont: 'inter', bodySize: 'spacious', dropCap: true },
        colors: { accent: 'red' },
        imageTreatment: { hero: 'split', radius: 'large' },
        components: { hero: 'article-hero', metadata: 'article-meta', body: 'article-body', related: 'related-articles' }
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.value.layout, 'split');
    assert.equal(result.value.stylePreset, 'cyberpunk-technology');
    assert.equal(result.value.typography.headingFont, 'inter');
    assert.equal(result.value.typography.dropCap, true);
    assert.equal(result.value.colors.accent, 'red');
    assert.equal(result.value.imageTreatment.hero, 'split');
});

test('invalid design data falls back safely and cannot select arbitrary components', () => {
    const result = validateArticleDesign({
        layout: 'javascript:alert(1)',
        stylePreset: 'custom-css',
        typography: { headingFont: 'https://evil.example/font.woff2', dropCap: 'yes' },
        colors: { accent: '#ff0000' },
        imageTreatment: { radius: '999px' },
        components: { hero: '../untrusted-component', related: 'article-body' }
    });

    assert.equal(result.value.layout, 'classic');
    assert.equal(result.value.stylePreset, 'minimal-news');
    assert.equal(result.value.typography.headingFont, 'newsreader');
    assert.equal(result.value.typography.dropCap, false);
    assert.equal(result.value.colors.accent, 'violet');
    assert.equal(result.value.imageTreatment.radius, 'medium');
    assert.equal(result.value.components.hero, 'article-hero');
    assert.equal(result.value.components.related, 'related-articles');
    assert.ok(result.errors.length >= 7);
});

test('catalog exposes metadata only and has no executable component source', () => {
    const catalog = getArticleDesignCatalog();
    assert.equal(catalog.layouts.length, 3);
    assert.equal(catalog.stylePresets.length, 4);
    assert.ok(catalog.components.every((component) => typeof component.id === 'string' && !Object.hasOwn(component, 'source') && !Object.hasOwn(component, 'path')));
    assert.ok(catalog.components.every((component) => ['article', 'editorial', 'layout'].includes(component.category)));
    assert.ok(catalog.components.every((component) => Array.isArray(component.variants) && Array.isArray(component.regions) && Array.isArray(component.properties)));
    assert.ok(catalog.components.every((component) => ['registered', 'planned'].includes(component.status) && component.preview === 'static'));
    assert.deepEqual(catalog.components.filter((component) => component.status === 'registered').map((component) => component.id).sort(), [
        'article-card', 'classic-editorial-layout', 'immersive-feature-layout', 'magazine-split-layout'
    ]);
});

test('layout resolution prefers a valid article override, then publication, then classic', () => {
    assert.equal(resolveArticleDesign({ layout: 'split' }, { layout: 'immersive' }).layout, 'immersive');
    assert.equal(resolveArticleDesign({ layout: 'split' }, null).layout, 'split');
    assert.equal(resolveArticleDesign({ layout: 'not-a-layout' }, { layout: 'also-invalid' }).layout, 'classic');
});

test('layout persistence accepts only an approved identifier', () => {
    assert.deepEqual(normalizeLayoutSelection({ layout: 'split' }), { layout: 'split' });
    assert.equal(normalizeLayoutSelection({ layout: '<script>' }), null);
    assert.equal(normalizeLayoutSelection({}), null);
});

test('style selections accept only allowlisted presets and typography tokens', () => {
    const result = normalizeStyleSelection({ stylePreset: 'luxury-editorial', typography: { headlineFont: 'newsreader', bodySize: 'spacious', lineHeight: 'airy' }, imageTreatment: 'framed' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.stylePreset, 'luxury-editorial');
    assert.equal(result.value.typography.bodySize, 'spacious');
    assert.equal(result.value.imageTreatment, 'framed');
    const unsafe = normalizeStyleSelection({ stylePreset: 'url(javascript:alert(1))', typography: { bodyFont: 'https://evil.example/font.woff2' }, imageTreatment: 'expression(alert(1))' });
    assert.equal(unsafe.value, null);
    assert.equal(unsafe.errors.length, 3);
});

test('style inheritance preserves fallback compatibility until a style is explicitly selected', () => {
    assert.equal(resolveArticleDesign({ layout: 'classic' }, null).styleSource, 'fallback');
    const publication = resolveArticleDesign({ layout: 'classic', stylePreset: 'cyberpunk-technology', typography: {}, imageTreatment: 'cinematic' }, null);
    assert.equal(publication.styleSource, 'publication');
    assert.equal(publication.stylePreset, 'cyberpunk-technology');
    assert.equal(resolveArticleDesign({ stylePreset: 'minimal-news', typography: {} }, { stylePreset: 'brutalist-magazine', typography: {} }).styleSource, 'article');
});

test('style presets keep hero headline colors in trusted layout CSS rather than applying a global heading override', () => {
    const css = fs.readFileSync(path.join(__dirname, '../site/src/styles/global.css'), 'utf8');
    assert.match(css, /\.article-style\[class\*='article-style--'\] \.article-body h2, \.article-style\[class\*='article-style--'\] \.article-body h3/);
    assert.doesNotMatch(css, /\.article-style\[class\*='article-style--'\] h1,/);
});

test('public rendering selects only fixed layout implementations, never catalog component IDs', () => {
    const articlePage = fs.readFileSync(path.join(__dirname, '../site/src/pages/blog/[slug].astro'), 'utf8');
    assert.match(articlePage, /layout === 'split'/);
    assert.match(articlePage, /layout === 'immersive'/);
    assert.doesNotMatch(articlePage, /design\.components|components\?\./);
});
