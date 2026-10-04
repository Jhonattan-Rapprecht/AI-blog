# Project Changelog

1. **Initial Setup & Architecture**
   - Initialized Git repository and project structure.
   - Implemented MySQL database schema for Articles, Categories, Tags, and AI Generations.
   - Established a high-performance database connection pool using `mysql2/promise`.
   - Created the core REST API for Article CRUD operations.
   - Set up a React + Vite frontend with a professional Article Editor.

2. **AI Integration (Ollama)**
   - Implemented a Provider Abstraction Layer to decouple the app from the LLM provider.
   - Integrated Ollama (Llama3) with strict JSON structured output.
   - Solved "truncated article" issues by optimizing `num_predict` (4096) and `num_ctx` (8192).
   - Implemented a validation layer to ensure AI responses match the required database schema.

3. **Real-time UX & Stability**
   - Integrated Socket.IO for live generation status updates.
   - Resolved critical CORS policy errors for local development.
   - Fixed `undefined` bind parameter crashes in the MySQL driver.
   - Implemented `AI Generation History` to track and debug prompts/responses.

4. **Core Pipeline Completion**
   - Integrated the full workflow: Topic $\to$ AI Generation $\to$ DB Persistence $\to$ UI Display.
   - Verified end-to-end stability and pushed the milestone to GitHub.
