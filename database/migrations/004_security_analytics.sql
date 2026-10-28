CREATE TABLE article_read_views (
    id CHAR(36) PRIMARY KEY, client_token CHAR(36) NOT NULL UNIQUE, article_id CHAR(36) NOT NULL,
    read_seconds INT UNSIGNED NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_article_read_views_date(created_at), INDEX idx_article_read_views_article_date(article_id, created_at)
);
CREATE TABLE request_protection_buckets (
    bucket_type VARCHAR(40) NOT NULL, bucket_key CHAR(64) NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY(bucket_type, bucket_key), INDEX idx_request_protection_cleanup(updated_at)
);
CREATE TABLE article_view_deduplications (
    article_id CHAR(36) NOT NULL, visitor_hash CHAR(64) NOT NULL, expires_at DATETIME(3) NOT NULL,
    PRIMARY KEY(article_id, visitor_hash), INDEX idx_article_view_deduplications_expiry(expires_at),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
