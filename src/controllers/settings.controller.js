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

    async checkModel(req, res) {
        const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
        if (!model) return res.status(400).json({ error: 'Choose a model to test.' });

        const settings = SettingsService.read();
        try {
            const models = await SettingsService.listModels(settings.ollamaBaseUrl);
            if (!models.includes(model)) return res.status(400).json({ error: `${model} is not installed in this Ollama instance.` });

            const startedAt = Date.now();
            const requestBody = {
                model,
                prompt: 'Return only this JSON object: {"ok": true}',
                stream: false,
                format: 'json',
                keep_alive: '0',
                options: { temperature: 0, num_ctx: 2048, num_predict: 128 }
            };
            if (/^qwen3(?:[.:]|$)/i.test(model)) requestBody.think = false;

            const response = await fetch(`${settings.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(120000),
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const details = await response.text();
                return res.status(502).json({ error: `Ollama could not run ${model} (HTTP ${response.status}): ${details}` });
            }

            const result = await response.json();
            const output = String(result.response || '').trim();
            if (!output) {
                const hasThinking = !!String(result.thinking || '').trim();
                const reason = hasThinking ? 'returned reasoning but no final response' : 'returned an empty response';
                return res.status(502).json({ error: `Ollama loaded ${model} but ${reason}.` });
            }
            try {
                JSON.parse(output);
            } catch {
                return res.status(502).json({ error: `${model} responded, but its output was not valid JSON. Article generation may fail with this model.` });
            }

            res.json({ model: result.model || model, connected: true, json: true, durationMs: Date.now() - startedAt, output: output.slice(0, 240) });
        } catch (error) {
            const reason = error.name === 'TimeoutError' ? 'timed out after 120 seconds' : error.message;
            res.status(502).json({ error: `Could not test ${model}: ${reason}` });
        }
    }
}

module.exports = new SettingsController();
