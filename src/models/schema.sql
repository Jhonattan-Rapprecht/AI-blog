-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles Table
CREATE TABLE IF NOT EXISTS articles (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    status ENUM('draft', 'review', 'scheduled', 'published', 'archived') DEFAULT 'draft',
    category_id CHAR(36),
    author_id CHAR(36),
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT, -- Stored as comma-separated or JSON string since MySQL lacks TEXT[]
    published_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article-Tags Join Table
CREATE TABLE IF NOT EXISTS article_tags (
    article_id CHAR(36),
    tag_id CHAR(36),
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- AI Generations Table
CREATE TABLE IF NOT EXISTS ai_generations (
    id CHAR(36) PRIMARY KEY,
    article_id CHAR(36),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response JSON NOT NULL,
    status ENUM('started', 'completed', 'failed') NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- Topic History Table (also created lazily by topic.history.model.js)
CREATE TABLE IF NOT EXISTS topic_history (
    id CHAR(36) PRIMARY KEY,
    topic VARCHAR(500) NOT NULL,
    normalized VARCHAR(500) NOT NULL,
    source ENUM('suggested', 'generated') NOT NULL DEFAULT 'suggested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_topic_normalized (normalized(191)),
    INDEX idx_topic_created (created_at)
);

-- Performance Indexes
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_scheduled_at ON articles(scheduled_at);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_category_id ON articles(category_id);
CREATE INDEX idx_ai_generations_article_id ON ai_generations(article_id);
