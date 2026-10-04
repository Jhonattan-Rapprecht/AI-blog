const AIProvider = {
    async generate(request) {
        throw new Error('Method generate() must be implemented');
    }
};

class OllamaProvider extends AIProvider {
    async generate({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2048, responseFormat = 'json' }) {
        const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model: process.env.OLLAMA_MODEL,
                prompt: `${systemPrompt}\n\n${userPrompt}`,
                stream: false,
                format: responseFormat === 'json' ? 'json' : undefined,
                options: { temperature, num_predict: maxTokens }
            })
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        const data = await response.json();

        return {
            content: data.response,
            provider: 'ollama',
            model: process.env.OLLAMA_MODEL,
            usage: data.eval_count
        };
    }
}

class OnlineProvider extends AIProvider {
    async generate(request) {
        // Implementation for online provider (e.g., OpenAI/Anthropic)
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
