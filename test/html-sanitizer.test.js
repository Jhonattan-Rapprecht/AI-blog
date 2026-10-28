const test = require('node:test');
const assert = require('node:assert/strict');

// These test-only placeholders let model modules load without contacting MySQL.
process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_USER ||= 'test-user';
process.env.DB_PASSWORD ||= 'test-password';
process.env.DB_NAME ||= 'test_database';

const { sanitizeArticleHtml } = require('../src/utils/htmlSanitizer');
const ArticleModel = require('../src/models/article.model');
const PublicBlogModel = require('../src/models/public.model');
const PublicBlogController = require('../src/controllers/public.controller');
const db = require('../src/config/db');
const { formatArticleContent } = require('../src/utils/articleFormatter');

test('preserves safe article formatting and supported Quill classes', () => {
    const result = sanitizeArticleHtml(`
        <h2 class="ql-align-center">Heading</h2><p class="ql-indent-2">A <strong>bold</strong>, <em>italic</em>,
        <u>underlined</u> and <s>struck</s> paragraph.</p><ol><li>One</li></ol>
        <blockquote>Quote</blockquote><pre><code>const value = 1;</code></pre>
        <a href="https://example.com">secure link</a><a href="/articles/example">relative link</a>
        <img src="/uploads/example.webp" alt="Example" width="640" loading="lazy">
        <table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td colspan="1">Value</td></tr></tbody></table>
    `);

    assert.match(result, /<h2 class="ql-align-center">Heading<\/h2>/);
    assert.match(result, /<p class="ql-indent-2">/);
    assert.match(result, /<strong>bold<\/strong>/);
    assert.match(result, /href="https:\/\/example.com"/);
    assert.match(result, /href="\/articles\/example"/);
    assert.match(result, /src="\/uploads\/example.webp"/);
    assert.match(result, /<table>/);
    assert.match(result, /<pre><code>const value = 1;<\/code><\/pre>/);
});

test('removes executable elements, event handlers, styles, and unapproved classes', () => {
    const result = sanitizeArticleHtml(`
        <p class="ql-align-right attacker" style="color:red" onclick="alert(1)">Safe</p>
        <script>alert(1)</script><iframe src="https://evil.example"></iframe>
        <form action="/x"><input name="x"></form><object data="x"></object><svg onload="alert(1)"></svg>
    `);

    assert.match(result, /class="ql-align-right"/);
    assert.doesNotMatch(result, /attacker|style=|onclick|<script|<iframe|<form|<object|<svg|<input/i);
});

test('blocks unsafe URLs while retaining safe link schemes and image sources', () => {
    const result = sanitizeArticleHtml(`
        <a href="javascript:alert(1)">bad</a><a href="mailto:hello@example.com">email</a><a href="tel:+311234">phone</a>
        <img src="data:image/png;base64,AAAA" alt="bad"><img src="javascript:alert(1)"><img src="https://example.com/image.png" alt="good"><img src="https://example.com/payload.svg">
    `);

    assert.doesNotMatch(result, /javascript:|data:image|payload\.svg/i);
    assert.match(result, /href="mailto:hello@example.com"/);
    assert.match(result, /href="tel:\+311234"/);
    assert.match(result, /src="https:\/\/example.com\/image.png"/);
});

test('adds noopener and noreferrer to new-tab links and is idempotent', () => {
    const once = sanitizeArticleHtml('<a href="https://example.com" target="_blank" rel="nofollow">Open</a>');
    const twice = sanitizeArticleHtml(once);

    assert.match(once, /target="_blank"/);
    assert.match(once, /rel="(?:nofollow noopener noreferrer|nofollow noreferrer noopener)"/);
    assert.equal(twice, once);
});

async function withArticlePersistenceStub(callback) {
    const originalQuery = db.query;
    const calls = [];

    db.query = async (sql, params = []) => {
        calls.push({ sql, params });
        return [];
    };

    try {
        await callback(calls);
    } finally {
        db.query = originalQuery;
    }
}

test('manual create and update sanitize article content before persistence', async () => {
    const unsafe = '<p onclick="alert(1)">Text</p><script>alert(1)</script>';

    await withArticlePersistenceStub(async (calls) => {
        await ArticleModel.create({ title: 'Manual', slug: 'manual', content: unsafe });
        const insert = calls.find(({ sql }) => sql.includes('INSERT INTO articles'));
        assert.ok(insert);
        assert.match(insert.params[4], /<p>Text<\/p>/);
        assert.doesNotMatch(insert.params[4], /script|onclick/i);

        calls.length = 0;
        await ArticleModel.update('article-id', { content: unsafe });
        const update = calls.find(({ sql }) => sql.startsWith('UPDATE articles SET'));
        assert.ok(update);
        assert.match(update.params[0], /<p>Text<\/p>/);
        assert.doesNotMatch(update.params[0], /script|onclick/i);
    });
});

test('AI-formatted article content is sanitized through ArticleModel.create', async () => {
    const aiHtml = formatArticleContent('<h2>Generated</h2><p onerror="alert(1)">Text</p><script>alert(1)</script>', 'Generated');

    await withArticlePersistenceStub(async (calls) => {
        await ArticleModel.create({ title: 'Generated', slug: 'generated', content: aiHtml, status: 'review' });
        const insert = calls.find(({ sql }) => sql.includes('INSERT INTO articles'));
        assert.ok(insert);
        assert.doesNotMatch(insert.params[4], /script|onerror/i);
        assert.match(insert.params[4], /<p>Text<\/p>/);
    });
});

test('public article response sanitizes unsafe legacy HTML', async () => {
    const originalGetArticleBySlug = PublicBlogModel.getArticleBySlug;
    const originalGetRelated = PublicBlogModel.getRelated;
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };

    PublicBlogModel.getArticleBySlug = async () => ({ id: 'legacy', content: '<p onerror="alert(1)">Legacy</p><script>alert(1)</script>' });
    PublicBlogModel.getRelated = async () => [];

    try {
        await PublicBlogController.getArticle({ params: { slug: 'legacy' } }, response);
        assert.equal(response.statusCode, 200);
        assert.match(response.body.content, /<p>Legacy<\/p>/);
        assert.doesNotMatch(response.body.content, /script|onerror/i);
    } finally {
        PublicBlogModel.getArticleBySlug = originalGetArticleBySlug;
        PublicBlogModel.getRelated = originalGetRelated;
    }
});
