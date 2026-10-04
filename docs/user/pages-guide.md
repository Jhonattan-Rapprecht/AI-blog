# Pages Guide

AI Blog consists of two websites:

- **AI Blog Studio** (admin): where you write, generate and publish articles.
- **AI Blog** (public site): where readers browse and read your published articles.

Start everything from the project root with:

```bash
npm run dev
```

| Website | Address |
|---------|---------|
| AI Blog Studio (admin) | http://localhost:5173 |
| AI Blog (public site) | http://localhost:4321 |

---

## AI Blog Studio (Admin)

### New article

**URL:** http://localhost:5173/

Write a new article or let AI generate one. Use the side panels to:

- **Publishing**: set the status (Draft, Review, Scheduled, Published, Archived) and category.
- **AI generation**: enter a topic (or click the sparkle button for topic suggestions), choose an audience and tone, then click **Generate article**.
- **SEO & metadata**: set the slug (the article's web address), excerpt, SEO title and SEO description.

Click **Save draft** to save the article.

![New article editor](screenshots/admin-editor.png)

### Articles

**URL:** http://localhost:5173/articles

An overview of all your articles with their status and creation date. Click an article to open it, or use the trash icon to delete it. Click **New article** to start a new one.

![Articles list](screenshots/admin-articles.png)

### Edit article

**URL:** http://localhost:5173/articles/{id}

Opens an existing article in the editor. Make your changes and click **Save changes**.

![Editing an existing article](screenshots/admin-edit-article.png)

---

## AI Blog (Public Site)

> Only articles with the status **Published** appear on the public site.

### Home

**URL:** http://localhost:4321/

The landing page with a featured article, the latest articles and a list of topics.

![Public home page](screenshots/site-home.png)

### Blog

**URL:** http://localhost:4321/blog

All published articles. You can:

- **Search**: type in the search box, e.g. http://localhost:4321/blog?q=music
- **Filter by category**: click a category button to open its category page, e.g. http://localhost:4321/category/business
- **Browse pages**: use the page buttons at the bottom, e.g. http://localhost:4321/blog?page=2

![Blog overview](screenshots/site-blog.png)

![Searching the blog](screenshots/site-blog-search.png)

### Article

**URL:** http://localhost:4321/blog/{slug}

The full article with its category, publish date and estimated reading time. Related articles are shown under **Keep reading**.

Example: http://localhost:4321/blog/ai-generated-music-the-future-of-composition-and-copyright-considerations

![Reading an article](screenshots/site-article.png)

### Category

**URL:** http://localhost:4321/category/{slug}

All published articles in one category, e.g. http://localhost:4321/category/business

Available categories: `business`, `entertainment`, `finance`, `geopolitics`, `health`, `lifestyle`, `technology`.

![Category page](screenshots/site-category.png)

### Page not found

Shown for any address that doesn't exist, e.g. http://localhost:4321/does-not-exist

![404 page](screenshots/site-404.png)

---

## Publishing an Article

1. Open http://localhost:5173/articles and click the article you want to publish.
2. In the **Publishing** panel, set **Status** to **Published**.
3. Click **Save changes**.
4. Visit http://localhost:4321/blog — the article is now live.

The publish date is set automatically the first time an article is published.

## Light and Dark Mode

Both websites have a sun/moon button in the top-right corner to switch between light and dark mode. Your choice is remembered.
