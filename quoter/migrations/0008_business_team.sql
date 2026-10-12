ALTER TABLE organizations ADD COLUMN tax_id TEXT;
ALTER TABLE organizations ADD COLUMN address TEXT;
ALTER TABLE organizations ADD COLUMN phone TEXT;
ALTER TABLE organizations ADD COLUMN contact_email TEXT;
ALTER TABLE organizations ADD COLUMN payment_terms TEXT;
ALTER TABLE quotes ADD COLUMN payment_terms TEXT;
CREATE TABLE memberships (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')),
 PRIMARY KEY(user_id,organization_id)
);
INSERT INTO memberships SELECT id,organization_id,'owner' FROM users;
ALTER TABLE sessions ADD COLUMN organization_id TEXT REFERENCES organizations(id);
UPDATE sessions SET organization_id=(SELECT organization_id FROM users WHERE users.id=sessions.user_id);
CREATE TABLE team_invitations (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 email TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('editor','viewer')),
 token_hash TEXT UNIQUE NOT NULL,
 expires_at INTEGER NOT NULL,
 accepted_at INTEGER,
 consumption_id TEXT
);
CREATE INDEX idx_team_invites_org ON team_invitations(organization_id);
