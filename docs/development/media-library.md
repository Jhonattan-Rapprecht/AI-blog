# Media Library and featured images

## Overview

Blogstudio stores uploaded raster images in `uploads/media/` and tracks metadata, including a reusable photo credit/source, in the MySQL `media` table. Articles reference library records through nullable `articles.featured_media_id`; the older `featured_image` URL field remains supported as a fallback. Existing databases create the media table and article column lazily when an article/media API or public article list is first used, and add the credit column when needed. New databases can use `src/models/schema.sql`.

The backend serves files at `/uploads/media/:filename`. The public Astro site resolves this path against the origin in `API_URL` (default `http://localhost:3000/api/public`). Production deployments should use durable mounted storage or object storage and configure a matching API/media origin; the current filesystem store is intended for this single-server app deployment.

## Admin workflow

- **Media Library** (`/media`) lists reusable media and accepts JPG, PNG, WebP, and GIF uploads up to 12 MB.
- The Editor's **Featured image** card previews the selected image, supports upload or selection from the library, and lets the user save its photo credit/source. The article association is persisted when the article is saved.
- Full article pages show a small **Photo credit/source** caption beneath the featured image. Article cards, blog overview/filter cards, and the homepage feature do not show the caption. An image without an attribution value displays **Not provided** on its article page.
- Media in use by an article cannot be deleted until unassigned.
- AI image generation is intentionally deferred while an image-generation solution is evaluated. The media record includes provider and prompt metadata so a future provider can be added without changing article associations.

## API

All media management routes require the admin JWT:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/media` | List media records, newest first |
| POST | `/api/media/upload?filename=...` | Upload image bytes; MIME is checked against file signatures |
| PUT | `/api/media/:id` | Update the reusable photo credit/source |
| DELETE | `/api/media/:id` | Delete an unused media record and local file |

Public article APIs return a media file path in `featured_image`, with legacy URLs as fallback. Article create/update accepts `featured_media_id`.

## Image generation

Image generation is not implemented yet. Upload and library selection work locally without an image API key or image-generation runtime. Standard Ollama text models do not generate image files; official Ollama image generation docs still list Windows and Linux support as upcoming. The provider and prompt metadata fields are reserved for a later provider integration.

The slow zoom-out/crop adjustment requested for images is also deferred. Current public image fitting behavior remains unchanged.

## Validation and future storage

The upload endpoint enforces a 12 MB request limit, allowlists JPEG/PNG/WebP/GIF, checks file signatures, generates a random disk filename, and stores the user's original name as metadata. SVG is intentionally excluded from public static hosting. For multi-instance deployments, replace local disk writes with shared object storage and serve through a CDN while preserving `filepath` as a stable public URL.
