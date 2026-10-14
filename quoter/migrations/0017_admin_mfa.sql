ALTER TABLE sessions ADD COLUMN mfa_verified_until INTEGER;
ALTER TABLE sessions ADD COLUMN mfa_factor_version TEXT;
CREATE TABLE admin_mfa (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 version TEXT NOT NULL,
 sealed_secret TEXT NOT NULL,
 pending_until INTEGER,
 enabled_at TEXT,
 last_step INTEGER NOT NULL DEFAULT -1,
 last_challenge TEXT
);
CREATE TABLE admin_mfa_recovery (
 user_id TEXT NOT NULL REFERENCES admin_mfa(user_id) ON DELETE CASCADE,
 code_hash TEXT NOT NULL,
 consumed_by TEXT,
 PRIMARY KEY(user_id,code_hash)
);
CREATE TRIGGER admin_mfa_write_guard BEFORE INSERT ON request_write_guards WHEN NEW.scope=3 BEGIN
 SELECT RAISE(ABORT,'QUOTER_MFA_REQUIRED') WHERE NOT EXISTS(
  SELECT 1 FROM sessions s JOIN admin_mfa f ON f.user_id=s.user_id
  WHERE s.token_hash=NEW.token_hash AND s.user_id=NEW.user_id AND f.enabled_at IS NOT NULL
   AND s.mfa_factor_version=f.version AND s.mfa_verified_until>unixepoch()
 );
END;
CREATE TRIGGER admin_mfa_reset AFTER DELETE ON admin_mfa WHEN OLD.enabled_at IS NOT NULL BEGIN
 DELETE FROM sessions WHERE user_id=OLD.user_id;
 INSERT INTO platform_audit(id,action,target_type,target_id,detail) VALUES(lower(hex(randomblob(16))),'mfa.reset','account',OLD.user_id,'{}');
END;
