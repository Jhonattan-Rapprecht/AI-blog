// Phase 1 is intentionally metadata-only. Language references are not loaded
// from arbitrary paths or remote URLs, and no dictionary is considered active
// until a later, controlled installation phase records its provenance.
const LANGUAGE_LIBRARY = Object.freeze([
    { id: 'nl', name: 'Dutch', nativeName: 'Nederlands', editorValue: 'Dutch', enabled: true },
    { id: 'en', name: 'English', nativeName: 'English', editorValue: 'English', enabled: true },
    { id: 'de', name: 'German', nativeName: 'Deutsch', editorValue: 'German', enabled: true },
    { id: 'fr', name: 'French', nativeName: 'Français', editorValue: 'French', enabled: true },
    { id: 'es', name: 'Spanish', nativeName: 'Español', editorValue: 'Spanish', enabled: true }
]);

const LANGUAGE_POLICY = Object.freeze({
    primaryLanguage: 'The language selected in the article Editor is authoritative.',
    detection: 'Language detection is a safeguard only; it must not silently replace the Editor selection.',
    ambiguousText: 'Mixed or low-confidence text must be held for manual review rather than automatically corrected.',
    references: 'Spelling dictionaries and grammar references must be local, versioned, licensed, and approved before use.'
});

const REFERENCE_READINESS = Object.freeze([
    { id: 'spelling', name: 'Spelling dictionary', status: 'not-installed', description: 'No local dictionary is active in Phase 1.' },
    { id: 'grammar', name: 'Grammar reference', status: 'not-configured', description: 'No local grammar reference is active in Phase 1.' }
]);

function getLanguageLibraryCatalog() {
    return {
        languages: LANGUAGE_LIBRARY.map((language) => ({ ...language, references: REFERENCE_READINESS })),
        policy: LANGUAGE_POLICY,
        referenceReadiness: REFERENCE_READINESS
    };
}

module.exports = { LANGUAGE_LIBRARY, LANGUAGE_POLICY, REFERENCE_READINESS, getLanguageLibraryCatalog };
