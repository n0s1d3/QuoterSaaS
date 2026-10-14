ALTER TABLE quotes ADD COLUMN deleted_at TEXT;
ALTER TABLE quotes ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN write_token TEXT;
CREATE INDEX idx_quotes_active_page ON quotes(organization_id,deleted_at,created_at DESC,id);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 quote_id TEXT,
 action TEXT NOT NULL,
 actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 actor_email TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_org ON audit_events(organization_id,created_at DESC,id);
CREATE INDEX idx_audit_quote ON audit_events(organization_id,quote_id,created_at DESC);
CREATE TABLE backup_restores (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 token_hash TEXT UNIQUE NOT NULL,
 content_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 completed_at TEXT,
 consumption_id TEXT
);
