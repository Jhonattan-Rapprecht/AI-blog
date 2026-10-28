const { errorDetails } = require('../utils/http-errors');

class AIProvider {
    async generate(request) {
        throw new Error('Method generate() must be implemented');
    }
}

class OllamaProvider extends AIProvider {
    async generate({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096, responseFormat = 'json' }) {
        try {
            const settings = require('../services/settings.service').read();
            const model = settings.model || process.env.OLLAMA_MODEL;
            const requestBody = {
                model,
                prompt: `${systemPrompt}\n\n${userPrompt}`,
                stream: false,
                format: responseFormat === 'json' ? 'json' : undefined,
                options: {
                    temperature,
                    num_predict: maxTokens,
                    num_ctx: 8192
                }
            };
            // Qwen3-family models default to a separate thinking phase. Disable it so
            // constrained JSON requests return their answer instead of spending the budget reasoning.
            if (/^qwen3(?:[.:]|$)/i.test(model)) requestBody.think = false;

            const response = await fetch(`${settings.ollamaBaseUrl || process.env.OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            if (!String(data.response || '').trim()) {
                const reason = String(data.thinking || '').trim()
                    ? 'returned reasoning but no final response'
                    : 'returned an empty response';
                throw new Error(`Ollama model ${model} ${reason}.`);
            }

            return {
                content: data.response,
                provider: 'ollama',
                model,
                usage: data.eval_count
            };
        } catch (error) {
            console.error('[OllamaProvider Error]:', errorDetails(error));
            throw error;
        }
    }
}

class OnlineProvider extends AIProvider {
    async generate(request) {
        throw new Error('Online provider not configured');
    }
}

class ProviderFactory {
    static getProvider() {
        const provider = process.env.AI_PROVIDER;
        if (provider === 'ollama') return new OllamaProvider();
        if (provider === 'online') return new OnlineProvider();
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

module.exports = { ProviderFactory };
