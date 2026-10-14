-- These rows exist only inside a D1 transaction and are removed before commit.
CREATE TABLE request_write_guards (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL,
 user_id TEXT NOT NULL,
 organization_id TEXT NOT NULL,
 scope INTEGER NOT NULL CHECK(scope IN(0,1,2,3))
);
CREATE TRIGGER request_authorization BEFORE INSERT ON request_write_guards BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id
  JOIN memberships m ON m.user_id=u.id AND m.organization_id=s.organization_id
  WHERE s.token_hash=NEW.token_hash AND u.id=NEW.user_id AND s.organization_id=NEW.organization_id
  AND s.expires_at>unixepoch() AND u.suspended_at IS NULL AND u.email_verified_at IS NOT NULL
 ) THEN RAISE(ABORT,'QUOTER_SESSION_REVOKED') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id
  WHERE m.user_id=NEW.user_id AND m.organization_id=NEW.organization_id AND (
   NEW.scope=0 OR (NEW.scope=1 AND m.role IN('owner','editor')) OR (NEW.scope=2 AND m.role='owner')
   OR (NEW.scope=3 AND EXISTS(SELECT 1 FROM platform_admin p WHERE p.email=u.email))
  )
 ) THEN RAISE(ABORT,'QUOTER_ACCESS_CHANGED') END;
END;
