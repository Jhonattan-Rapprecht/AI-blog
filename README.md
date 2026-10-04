# 🚀 AI-Powered High-Performance Blog

A professional blogging platform that leverages local LLMs (via Ollama) to generate, edit, store, and automatically publish high-quality SEO-optimized articles.

## 🌟 Key Features

- **AI-Driven Generation**: Generate full articles with structured JSON output including SEO titles, descriptions, and keywords.
- **Local LLM First**: Integrated with **Ollama** for privacy and cost-efficiency, with a provider-agnostic architecture.
- **High Performance**: 
  - MySQL connection pooling for low-latency DB access.
  - Strategic indexing on slugs, status, and scheduling timestamps.
  - Asynchronous background processing for AI and scheduling.
- **Real-time UX**: Socket.IO integration for live AI generation status and publication alerts.
- **Automated Workflow**: Server-side scheduler for automatic publication and autonomous AI article generation.
- **SEO Optimized**: Built-in fields for SEO metadata and slug management.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, Vite, Lucide-React
- **Database**: MySQL 8.0+
- **AI**: Ollama (Primary), Provider Abstraction Layer
- **Real-time**: Socket.IO
- **API**: RESTful

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MySQL
- [Ollama](https://ollama.ai/) installed and running

### Setup
1. **Clone the repo**:
   ```bash
   git clone https://github.com/Jhonattan-Rapprecht/AI-blog.git
   cd AI-blog
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials and Ollama model
   ```

4. **Initialize Database**:
   Run the SQL script in `src/models/schema.sql` on your MySQL instance.

5. **Pull the LLM**:
   ```bash
   ollama pull llama3
   ```

6. **Run the App**:
   ```bash
   # Start Backend
   npm start 
   
   # Start Frontend (in another terminal)
   cd frontend && npm run dev
   ```

## 📐 Architecture

The system follows a modular service-oriented architecture:
`Browser` $\to$ `API/Sockets` $\to$ `Controllers` $\to$ `Services` $\to$ `Models` $\to$ `MySQL/Ollama`

## 📝 License
MIT
