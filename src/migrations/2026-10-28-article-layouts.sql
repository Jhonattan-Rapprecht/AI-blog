-- Phase 2: validated publication default and per-article layout selection.
-- Apply once per database with the normal deployment migration process.
-- Existing articles intentionally receive no override and resolve to Classic Editorial.

CREATE TABLE IF NOT EXISTS publication_design_settings (
    id TINYINT UNSIGNED PRIMARY KEY,
    schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
    design_config JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_publication_design_settings_singleton CHECK (id = 1)
);

INSERT IGNORE INTO publication_design_settings (id, schema_version, design_config)
VALUES (1, 1, JSON_OBJECT('layout', 'classic'));

CREATE TABLE IF NOT EXISTS article_design_overrides (
    article_id CHAR(36) PRIMARY KEY,
    design_config JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
