# Ollama Model Selection and Checks

The Settings page lists models installed in the configured Ollama instance. Selecting a different model changes the form only; the app continues using the saved model until **Save changes** is pressed. The active model is shown separately from an unsaved selection.

The Ollama connection indicator checks whether the Ollama API is reachable. It does not confirm that a specific model can complete an app request. **Test selected model** checks the currently selected model before saving it by sending a short JSON-mode request to Ollama's `/api/generate` endpoint. The check reports the model returned by Ollama, elapsed time, and any loading, timeout, empty-response, or invalid-JSON error. It sets `keep_alive` to `0` so the test model is unloaded afterward.

Qwen3-family models such as `qwen3.5:4b` default to a separate thinking phase. For this app's constrained JSON prompts, the provider and model check send `think: false` so the model returns its answer directly instead of spending the response budget on reasoning.

After a successful check, save the selection to apply it to article generation, topic suggestions, and slug suggestions. The check is a short compatibility check; it confirms that the model can answer in JSON mode, while longer article generation can still fail for model-specific reasons. Article-generation errors are returned to the admin for diagnosis.
