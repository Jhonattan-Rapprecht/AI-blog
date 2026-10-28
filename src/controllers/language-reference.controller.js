const LanguageReferenceModel = require('../models/language-reference.model');
const { validateReference } = require('../config/language-reference.config');

class LanguageReferenceController {
    async list(req, res) {
        try { res.json(await LanguageReferenceModel.list()); }
        catch (error) { res.status(500).json({ error: 'Could not load language references.' }); }
    }

    async create(req, res) {
        const { value, errors } = validateReference(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try {
            const reference = await LanguageReferenceModel.create(value);
            req.activityTargetLabel = `${reference.languageId} ${reference.referenceType} reference`;
            res.status(201).json(reference);
        } catch (error) { res.status(500).json({ error: 'Could not create language reference.' }); }
    }

    async update(req, res) {
        const { value, errors } = validateReference(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try {
            const reference = await LanguageReferenceModel.update(req.params.id, value);
            if (!reference) return res.status(404).json({ error: 'Language reference not found.' });
            req.activityTargetLabel = `${reference.languageId} ${reference.referenceType} reference`;
            res.json(reference);
        } catch (error) { res.status(500).json({ error: 'Could not update language reference.' }); }
    }

    async remove(req, res) {
        try {
            const reference = await LanguageReferenceModel.remove(req.params.id);
            if (!reference) return res.status(404).json({ error: 'Language reference not found.' });
            req.activityTargetLabel = `${reference.languageId} ${reference.referenceType} reference`;
            res.status(204).end();
        } catch (error) { res.status(500).json({ error: 'Could not delete language reference.' }); }
    }
}

module.exports = new LanguageReferenceController();
