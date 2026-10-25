const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', '..', 'data', 'settings.json');
const defaults = {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
    language: 'English',
    tone: 'Professional',
    audience: 'General',
    articleLength: 'Medium'
};

function read() {
    try {
        return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
    } catch {
        return { ...defaults };
    }
}

function save(settings) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    return settings;
}

async function listModels(baseUrl = read().ollamaBaseUrl) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const body = await response.json();
    return (body.models || []).map((model) => model.name).filter(Boolean);
}

async function ollamaStatus(baseUrl = read().ollamaBaseUrl) {
    try {
        const models = await listModels(baseUrl);
        return { models, connected: true };
    } catch {
        return { models: [], connected: false };
    }
}

module.exports = { read, save, listModels, ollamaStatus };
