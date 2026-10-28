// Read-only adoption requirements. This is intentionally conservative: a legacy
// database must match all listed structures before a baseline can be recorded.
const requiredTables = {
    categories: ['id', 'name', 'slug', 'description', 'created_at'],
    media: ['id', 'filename', 'filepath', 'mime_type', 'file_size', 'media_type', 'source_type', 'source_url', 'thumbnail_url', 'width', 'height', 'provider', 'prompt', 'credit', 'created_at'],
    topics: ['id', 'name', 'normalized_hash', 'created_at'],
    articles: ['id', 'title', 'slug', 'excerpt', 'content', 'featured_image', 'featured_media_id', 'status', 'category_id', 'topic_id', 'author_id', 'seo_title', 'seo_description', 'seo_keywords', 'published_at', 'scheduled_at', 'created_at', 'updated_at'],
    tags: ['id', 'name', 'slug', 'created_at'],
    article_tags: ['article_id', 'tag_id'],
    ai_generations: ['id', 'article_id', 'provider', 'model', 'prompt', 'response', 'status', 'error_message', 'created_at'],
    article_reviews: ['id', 'article_id', 'model', 'category', 'check_type', 'reviewed_at'],
    article_review_findings: ['id', 'review_id', 'field_name', 'finding_type', 'severity', 'quote', 'sentence_quote', 'neutral_rewrite', 'explanation', 'suggestion', 'status', 'action', 'created_at', 'updated_at'],
    topic_history: ['id', 'topic', 'normalized', 'source', 'created_at'],
    language_references: ['id', 'language_id', 'reference_type', 'source_name', 'license', 'version', 'source_reference', 'checksum', 'review_state', 'validation_state', 'created_at', 'updated_at'],
    publication_design_settings: ['id', 'schema_version', 'design_config', 'updated_at'],
    article_design_overrides: ['article_id', 'design_config', 'created_at', 'updated_at'],
    article_read_views: ['id', 'client_token', 'article_id', 'read_seconds', 'created_at'],
    request_protection_buckets: ['bucket_type', 'bucket_key', 'attempts', 'window_started_at', 'updated_at'],
    article_view_deduplications: ['article_id', 'visitor_hash', 'expires_at'],
    system_activity_logs: ['id', 'category', 'event_type', 'severity', 'outcome', 'actor_type', 'actor', 'source', 'action', 'target_type', 'target_id', 'target_label', 'method', 'path', 'status_code', 'ip_address', 'user_agent', 'details', 'created_at']
};

const requiredIndexes = {
    articles: ['PRIMARY', 'slug', 'idx_articles_status', 'idx_articles_published_at', 'idx_articles_topic_id'],
    article_read_views: ['PRIMARY', 'client_token', 'idx_article_read_views_date', 'idx_article_read_views_article_date'],
    request_protection_buckets: ['PRIMARY', 'idx_request_protection_cleanup'],
    article_view_deduplications: ['PRIMARY', 'idx_article_view_deduplications_expiry']
};

module.exports = { requiredTables, requiredIndexes };
