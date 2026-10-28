CREATE TABLE categories (
    id CHAR(36) PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE media (
    id CHAR(36) PRIMARY KEY, filename VARCHAR(255) NOT NULL, filepath VARCHAR(500) NULL,
    mime_type VARCHAR(100) NOT NULL, file_size BIGINT UNSIGNED NOT NULL, media_type ENUM('image','video') NOT NULL DEFAULT 'image',
    source_type ENUM('upload','link') NOT NULL DEFAULT 'upload', source_url VARCHAR(2048) NULL, thumbnail_url VARCHAR(2048) NULL,
    width INT UNSIGNED NULL, height INT UNSIGNED NULL, provider VARCHAR(50) NOT NULL DEFAULT 'upload', prompt TEXT NULL,
    credit VARCHAR(500) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_media_created_at (created_at)
);
CREATE TABLE topics (id CHAR(36) PRIMARY KEY, name VARCHAR(500) NOT NULL, normalized_hash CHAR(64) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE articles (
    id CHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, excerpt TEXT, content TEXT NOT NULL,
    featured_image TEXT, featured_media_id CHAR(36) NULL, status ENUM('draft','review','scheduled','published','archived') DEFAULT 'draft',
    category_id CHAR(36), topic_id CHAR(36) NULL, author_id CHAR(36), seo_title VARCHAR(255), seo_description TEXT, seo_keywords TEXT,
    published_at TIMESTAMP NULL, scheduled_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT,
    FOREIGN KEY (featured_media_id) REFERENCES media(id) ON DELETE SET NULL,
    INDEX idx_articles_status (status), INDEX idx_articles_scheduled_at (scheduled_at), INDEX idx_articles_published_at (published_at), INDEX idx_articles_category_id (category_id), INDEX idx_articles_topic_id (topic_id)
);
CREATE TABLE tags (id CHAR(36) PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, slug VARCHAR(50) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE article_tags (article_id CHAR(36), tag_id CHAR(36), PRIMARY KEY(article_id, tag_id), FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE, FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE);
CREATE TABLE ai_generations (id CHAR(36) PRIMARY KEY, article_id CHAR(36), provider VARCHAR(50) NOT NULL, model VARCHAR(100) NOT NULL, prompt TEXT NOT NULL, response JSON NOT NULL, status ENUM('started','completed','failed') NOT NULL, error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE SET NULL, INDEX idx_ai_generations_article_id (article_id));
