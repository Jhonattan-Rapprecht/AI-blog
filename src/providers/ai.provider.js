class AIProvider {
    async generate(request) {
        throw new Error('Method generate() must be implemented');
    }
}

class OllamaProvider extends AIProvider {
    async generate({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096, responseFormat = 'json' }) {
        try {
            const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL,
                    prompt: `${systemPrompt}\n\n${userPrompt}`,
                    stream: false,
                    format: responseFormat === 'json' ? 'json' : undefined,
                    options: {
                        temperature,
                        num_predict: maxTokens,
                        num_ctx: 8192
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            return {
                content: data.response,
                provider: 'ollama',
                model: process.env.OLLAMA_MODEL,
                usage: data.eval_count
            };
        } catch (error) {
            console.error('[OllamaProvider Error]:', error);
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
