CREATE TABLE publication_design_settings (
    id TINYINT UNSIGNED PRIMARY KEY, schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1, design_config JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_publication_design_settings_singleton CHECK (id = 1)
);
INSERT INTO publication_design_settings (id, schema_version, design_config) VALUES (1, 1, JSON_OBJECT('layout', 'classic'));
CREATE TABLE article_design_overrides (
    article_id CHAR(36) PRIMARY KEY, design_config JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
