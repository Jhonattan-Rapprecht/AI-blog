const SettingsService = require('../services/settings.service');

const allowedFields = ['model', 'language', 'tone', 'audience', 'articleLength'];

class SettingsController {
    async get(req, res) {
        try {
            const settings = SettingsService.read();
            const { models, connected } = await SettingsService.ollamaStatus(settings.ollamaBaseUrl);
            const model = models.includes(settings.model) ? settings.model
                : models.includes(`${settings.model}:latest`) ? `${settings.model}:latest`
                : settings.model;
            res.json({ ...settings, model, models, connected, provider: 'ollama' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const settings = SettingsService.read();
            const updates = req.body || {};
            for (const key of Object.keys(updates)) {
                if (!allowedFields.includes(key)) return res.status(400).json({ error: `Setting cannot be changed: ${key}` });
            }
            const { models, connected } = await SettingsService.ollamaStatus(settings.ollamaBaseUrl);
            if (updates.model && updates.model !== settings.model && (!connected || !models.includes(updates.model))) {
                return res.status(400).json({ error: 'Choose a model currently installed in Ollama.' });
            }
            for (const key of allowedFields) {
                if (updates[key] !== undefined) {
                    if (typeof updates[key] !== 'string' || !updates[key].trim()) {
                        return res.status(400).json({ error: `${key} must be a non-empty string.` });
                    }
                    settings[key] = updates[key].trim();
                }
            }
            SettingsService.save(settings);
            res.json({ ...settings, models, connected, provider: 'ollama' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SettingsController();
