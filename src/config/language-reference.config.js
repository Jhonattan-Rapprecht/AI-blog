const { LANGUAGE_LIBRARY } = require('./language-library.config');

const LANGUAGE_IDS = new Set(LANGUAGE_LIBRARY.map((language) => language.id));
const REFERENCE_TYPES = new Set(['spelling', 'grammar']);
const REVIEW_STATES = new Set(['planned', 'reviewed', 'approved']);
const VALIDATION_STATES = new Set(['not-validated', 'verified']);

const clean = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

function validateReference(input = {}) {
    const reference = {
        languageId: clean(input.languageId, 10),
        referenceType: clean(input.referenceType, 20),
        sourceName: clean(input.sourceName, 255),
        license: clean(input.license, 255),
        version: clean(input.version, 100),
        sourceReference: clean(input.sourceReference, 500),
        checksum: clean(input.checksum, 128),
        reviewState: clean(input.reviewState, 20) || 'planned',
        validationState: clean(input.validationState, 20) || 'not-validated'
    };
    const errors = [];
    if (!LANGUAGE_IDS.has(reference.languageId)) errors.push('Choose an approved language.');
    if (!REFERENCE_TYPES.has(reference.referenceType)) errors.push('Choose spelling or grammar.');
    if (!reference.sourceName) errors.push('Source name is required.');
    if (!reference.license) errors.push('License is required.');
    if (!reference.version) errors.push('Version is required.');
    if (!reference.sourceReference) errors.push('Source reference is required.');
    if (!REVIEW_STATES.has(reference.reviewState)) errors.push('Choose a valid review state.');
    if (!VALIDATION_STATES.has(reference.validationState)) errors.push('Choose a valid validation state.');
    return { value: reference, errors };
}

module.exports = { REFERENCE_TYPES, REVIEW_STATES, VALIDATION_STATES, validateReference };
