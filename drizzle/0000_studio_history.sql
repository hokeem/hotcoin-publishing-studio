CREATE TABLE studio_publications (id TEXT PRIMARY KEY NOT NULL, locale TEXT NOT NULL, content_type TEXT NOT NULL, caption TEXT NOT NULL, state TEXT NOT NULL, job_id TEXT, post_id TEXT, post_url TEXT, scheduled_at TEXT, published_at TEXT, thumbnail TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, metrics_json TEXT, collected_at TEXT, metrics_error TEXT);
--> statement-breakpoint
CREATE INDEX studio_publications_account_date ON studio_publications(locale, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX studio_publications_post ON studio_publications(locale, post_id) WHERE post_id IS NOT NULL;
