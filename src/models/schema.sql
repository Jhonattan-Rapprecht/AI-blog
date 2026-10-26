-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded and generated image assets used by article featured images.
CREATE TABLE IF NOT EXISTS media (
    id CHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    width INT UNSIGNED NULL,
    height INT UNSIGNED NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'upload',
    prompt TEXT NULL,
    credit VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_created_at (created_at)
);

-- Reusable topics shared by articles.
CREATE TABLE IF NOT EXISTS topics (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    normalized_hash CHAR(64) NOT NULL UNIQUE,
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
    featured_media_id CHAR(36) NULL,
    status ENUM('draft', 'review', 'scheduled', 'published', 'archived') DEFAULT 'draft',
    category_id CHAR(36),
    topic_id CHAR(36) NULL,
    author_id CHAR(36),
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT, -- Stored as comma-separated or JSON string since MySQL lacks TEXT[]
    published_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT,
    FOREIGN KEY (featured_media_id) REFERENCES media(id) ON DELETE SET NULL
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

-- Persist article review runs and the state of each suggestion until its article is deleted.
CREATE TABLE IF NOT EXISTS article_reviews (
    id CHAR(36) PRIMARY KEY,
    article_id CHAR(36) NOT NULL,
    model VARCHAR(100) NULL,
    category VARCHAR(500) NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_article_reviews_article_date (article_id, reviewed_at)
);

CREATE TABLE IF NOT EXISTS article_review_findings (
    id CHAR(36) PRIMARY KEY,
    review_id CHAR(36) NOT NULL,
    field_name VARCHAR(20) NOT NULL DEFAULT 'content',
    finding_type VARCHAR(30) NOT NULL,
    severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
    quote VARCHAR(500) NOT NULL,
    sentence_quote TEXT NULL,
    neutral_rewrite TEXT NULL,
    explanation TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    status ENUM('pending', 'dismissed', 'applied') NOT NULL DEFAULT 'pending',
    action VARCHAR(30) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES article_reviews(id) ON DELETE CASCADE,
    INDEX idx_review_findings_review (review_id, created_at)
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
CREATE INDEX idx_articles_topic_id ON articles(topic_id);
CREATE INDEX idx_ai_generations_article_id ON ai_generations(article_id);

-- Anonymous public article visits and accumulated visible read time.
CREATE TABLE IF NOT EXISTS article_read_views (
    id CHAR(36) PRIMARY KEY,
    article_id CHAR(36) NOT NULL,
    read_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_article_read_views_date (created_at),
    INDEX idx_article_read_views_article_date (article_id, created_at)
);
