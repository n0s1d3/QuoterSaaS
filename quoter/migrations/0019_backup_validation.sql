ALTER TABLE backup_restores ADD COLUMN validation_cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE backup_restores ADD COLUMN validation_ready INTEGER NOT NULL DEFAULT 0;
CREATE TABLE backup_restore_images (
 restore_id TEXT NOT NULL REFERENCES backup_restores(id) ON DELETE CASCADE,
 logo_id TEXT NOT NULL,
 logo TEXT NOT NULL,
 PRIMARY KEY (restore_id,logo_id)
);
CREATE INDEX idx_backup_restores_expiry ON backup_restores(expires_at);
CREATE INDEX idx_backup_restores_pending ON backup_restores(organization_id,user_id,completed_at);
