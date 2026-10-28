-- DEPRECATED — HISTORICAL REFERENCE ONLY.
-- Do not execute this file against development, staging, or production databases.
-- The authoritative schema source is database/migrations/ and the supported
-- executor is database/migrate.js. Consult the current deployment documentation.

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reusable image and video assets or hosted video links used in article content.
CREATE TABLE IF NOT EXISTS media (
    id CHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
    source_type ENUM('upload', 'link') NOT NULL DEFAULT 'upload',
    source_url VARCHAR(2048) NULL,
    thumbnail_url VARCHAR(2048) NULL,
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

-- Validated publishing design state. JSON contains layout identifiers only in Phase 2.
CREATE TABLE IF NOT EXISTS publication_design_settings (
    id TINYINT UNSIGNED PRIMARY KEY,
    schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
    design_config JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_publication_design_settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS article_design_overrides (
    article_id CHAR(36) PRIMARY KEY,
    design_config JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Auditable metadata for local spelling and grammar references. This table
-- never activates or executes a source; activation requires a later validated import phase.
CREATE TABLE IF NOT EXISTS language_references (
    id CHAR(36) PRIMARY KEY,
    language_id VARCHAR(10) NOT NULL,
    reference_type ENUM('spelling', 'grammar') NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    license VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    source_reference VARCHAR(500) NOT NULL,
    checksum VARCHAR(128) NULL,
    review_state ENUM('planned', 'reviewed', 'approved') NOT NULL DEFAULT 'planned',
    validation_state ENUM('not-validated', 'verified') NOT NULL DEFAULT 'not-validated',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_language_references_language (language_id, reference_type),
    INDEX idx_language_references_review (review_state, validation_state)
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
    check_type VARCHAR(50) NULL,
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
    client_token CHAR(36) NOT NULL UNIQUE,
    article_id CHAR(36) NOT NULL,
    read_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_article_read_views_date (created_at),
    INDEX idx_article_read_views_article_date (article_id, created_at)
);

-- Hashed, fixed-window buckets shared by every API instance using this database.
-- No raw IP addresses, account names, passwords, prompts, or article text are retained.
CREATE TABLE IF NOT EXISTS request_protection_buckets (
    bucket_type VARCHAR(40) NOT NULL,
    bucket_key CHAR(64) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (bucket_type, bucket_key),
    INDEX idx_request_protection_cleanup (updated_at)
);

-- Short-lived, hashed deduplication for public article view events.
CREATE TABLE IF NOT EXISTS article_view_deduplications (
    article_id CHAR(36) NOT NULL,
    visitor_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    PRIMARY KEY (article_id, visitor_hash),
    INDEX idx_article_view_deduplications_expiry (expires_at),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Flexible audit/report event store. Request and event metadata must not include secrets or full article content.
CREATE TABLE IF NOT EXISTS system_activity_logs (
    id CHAR(36) PRIMARY KEY,
    category VARCHAR(40) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
    outcome ENUM('success', 'rejected', 'failure', 'observed') NOT NULL DEFAULT 'success',
    actor_type ENUM('administrator', 'system', 'anonymous') NOT NULL DEFAULT 'system',
    actor VARCHAR(255) NULL,
    `source` VARCHAR(100) NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    target_type VARCHAR(60) NULL,
    target_id VARCHAR(255) NULL,
    target_label VARCHAR(500) NULL,
    method VARCHAR(10) NULL,
    path VARCHAR(500) NULL,
    status_code SMALLINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    details JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_category_created (category, created_at),
    INDEX idx_activity_severity_created (severity, created_at),
    INDEX idx_activity_actor_created (actor, created_at),
    INDEX idx_activity_event_created (event_type, created_at)
);
