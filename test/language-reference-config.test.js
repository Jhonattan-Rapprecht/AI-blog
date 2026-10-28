const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReference } = require('../src/config/language-reference.config');

const complete = {
    languageId: 'nl', referenceType: 'spelling', sourceName: 'Approved local source', license: 'Example license',
    version: '1.2.3', sourceReference: 'Internal acquisition record', checksum: 'abc123', reviewState: 'reviewed', validationState: 'verified'
};

test('language references require governed provenance metadata', () => {
    const result = validateReference(complete);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.value, complete);
});

test('language references reject unapproved languages, types, and workflow states', () => {
    const result = validateReference({ ...complete, languageId: 'arbitrary', referenceType: 'remote-script', reviewState: 'active', validationState: 'trusted' });
    assert.deepEqual(result.errors, ['Choose an approved language.', 'Choose spelling or grammar.', 'Choose a valid review state.', 'Choose a valid validation state.']);
});
