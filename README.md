# 🚀 AI-Powered High-Performance Blog

A professional blogging platform that leverages local LLMs (via Ollama) to generate, edit, store, and automatically publish high-quality SEO-optimized articles. With a particularly strong focus on Privacy and Cost-efficiency. Also with a simple implementation flow and application management features that are modular and service oriented.

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
- **AI Topic Ideation**: One-click, AI-suggested article topics to overcome writer's block.
- **Smart Slug Generation**: AI-suggested, SEO-friendly URL slugs based on your article title.
- **Rich Text Editor**: Professional writing experience powered by `react-quill-new`.
- **Category & Audience Management**: Add and delete categories and audiences straight from the editor.
- **Light & Dark Themes**: Full theme support, toggled from the collapsible Settings sidebar.
- **Collapsible Control Center**: A sidebar for live AI connection monitoring and workspace settings.
- **Provider Factory**: Switch between Ollama (local) and online AI providers without touching application logic.
- **Public Blog Site**: A fast, server-rendered Astro website for readers with search, categories, related articles and full SEO meta tags, in the same black-and-white style as the admin.
- **Component Library & Preview (Developers)**: A typed, reusable UI component library plus a `/dev/components` workspace to preview, inspect and convert HTML/CSS components to React. This is the foundation for customizing the layout and elements of the blog system later on.

## 🧠 How the AI Works

The platform implements a sophisticated **Provider Abstraction Layer** to decouple the application logic from the LLM provider.

### The Workflow:
1. **Request**: The user provides a topic, tone, and target audience via the React frontend.
2. **Prompt Engineering**: The `AIService` constructs a strict system prompt requiring the LLM to return **only** a structured JSON object.
3. **Local Execution**: The request is sent to **Ollama** (running locally) using the `llama3` model. 
4. **Optimization**: To prevent truncated articles, we explicitly configure `num_predict: 4096` (max tokens) and `num_ctx: 8192` (context window).
5. **Validation**: The backend parses the JSON response and validates all required fields (title, content, SEO tags) before saving to the database.
6. **Real-time Feedback**: Throughout the process, the server emits Socket.IO events (`ai:generation:started`, `ai:generation:completed`) so the user sees live progress.

## 🖼️ Gallery
*(Screenshots will be added here as the project grows)*
- `frontend-editor.png` - The AI-powered article editor.
  ![AI-powered article editor](screenshots/frontend-editor.png)
- `editor-light.png` - The editor in light mode.
  ![Article editor in light mode](screenshots/editor-light.png)
- `settings-sidebar.png` - The collapsible Settings sidebar with live AI connection status and the theme toggle.
  ![Settings sidebar](screenshots/settings-sidebar.png)
- `admin-dashboard.png` - Real-time AI status and article management.
  ![Article management dashboard](docs/user/screenshots/admin-articles.png)
- `public-blog.png` - The high-performance public reading experience.
  ![Public blog home page](docs/user/screenshots/site-home.png)
- `dev-components.png` - The developer component preview workspace.
  ![Component preview workspace](screenshots/dev-components.png)

More screenshots of every page are available in the [Pages Guide](docs/user/pages-guide.md).

## 🧩 Component Library & Preview System (Developers)

The admin app includes an internal component library and a preview workspace so the UI stays consistent as the project grows.

### Component library
Located in `frontend/src/components/`, written in TypeScript + Tailwind and built on shadcn-ui:

| Folder | Purpose |
|--------|---------|
| `ui/` | shadcn-ui primitives (Button, Badge, Card, ...) |
| `core/` | Custom reusable components such as `PrimaryButton` |
| `data/` | Admin-style data components (tables, badges, list rows) |
| `layout/` | Containers, wrappers and page sections (e.g. `AppShell`) |

All components follow the existing design system: the monochrome palette, spacing, typography, radius and table style of the admin pages.

```tsx
import { PrimaryButton } from '@/components/core'

<PrimaryButton icon={Save} loading={saving} onClick={save}>Save draft</PrimaryButton>
```

### Component preview workspace
Open **http://localhost:5173/dev/components** (or **Developer → Components** in the sidebar).

1. Paste an HTML file (and optionally a CSS file with the same name) into `frontend/src/component-previews/`, e.g. `pricing-card.html` + `pricing-card.css`.
2. It appears in the list instantly and is rendered in an isolated preview using the app's theme colors (light and dark).
3. Inspect the raw **HTML** and **CSS**, **Copy** the code, or click **Convert to React** to get a JSX component.

The workspace only exists in development and is left out of production builds, so it never affects the blog or CMS.

### Roadmap
The component library and preview workspace are the first step toward making the AI blog system customizable: choosing and adjusting layouts, article formatting styles and page elements, without editing application code.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Admin Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn-ui, Axios, Socket.IO Client, Lucide-React, React-Quill-New
- **Public Site**: Astro (server-rendered), Tailwind CSS
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
   cd site && npm install && cd ..
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
   # Start the API, admin and public site together
   npm run dev
   ```

   | App | URL |
   |-----|-----|
   | API | http://localhost:3000 |
   | Admin (AI Blog Studio) | http://localhost:5173 |
   | Public blog | http://localhost:4321 |
   | Component preview (dev only) | http://localhost:5173/dev/components |

## 📚 Documentation

- [Pages Guide](docs/user/pages-guide.md): every page with screenshots and how to publish an article.
- [Pages & Routes Reference](docs/development/pages-and-routes.md): all routes, source files and API endpoints.
- [Development changelogs](docs/development/): history of each project milestone.

## 📐 Architecture

The system follows a modular service-oriented architecture:
`Browser` $\to$ `API/Sockets` $\to$ `Controllers` $\to$ `Services` $\to$ `Models` $\to$ `MySQL/Ollama`

The repository contains three apps that share one API:
- `src/`: Express API (admin and public endpoints, AI services, scheduler)
- `frontend/`: React admin for writing, generating and managing articles
- `site/`: Astro public blog for readers

## 📝 License
MIT
