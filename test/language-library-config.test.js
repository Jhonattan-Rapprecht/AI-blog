const test = require('node:test');
const assert = require('node:assert/strict');

const { LANGUAGE_LIBRARY, LANGUAGE_POLICY, REFERENCE_READINESS, getLanguageLibraryCatalog } = require('../src/config/language-library.config');

test('language library exposes only approved editor languages and metadata', () => {
    const catalog = getLanguageLibraryCatalog();
    assert.deepEqual(catalog.languages.map((language) => language.editorValue), ['Dutch', 'English', 'German', 'French', 'Spanish']);
    assert.ok(catalog.languages.every((language) => language.enabled && typeof language.id === 'string'));
    assert.ok(catalog.languages.every((language) => !Object.hasOwn(language, 'path') && !Object.hasOwn(language, 'url') && !Object.hasOwn(language, 'source')));
    assert.equal(catalog.languages.length, LANGUAGE_LIBRARY.length);
});

test('language policy keeps the editor selection authoritative and references inactive', () => {
    assert.match(LANGUAGE_POLICY.primaryLanguage, /authoritative/i);
    assert.match(LANGUAGE_POLICY.detection, /must not silently replace/i);
    assert.deepEqual(REFERENCE_READINESS.map((reference) => reference.status), ['not-installed', 'not-configured']);
});
