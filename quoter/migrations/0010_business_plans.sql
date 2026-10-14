CREATE TABLE subscription_plans (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 quote_limit INTEGER NOT NULL CHECK(quote_limit>0),
 catalog_limit INTEGER NOT NULL CHECK(catalog_limit>0),
 member_limit INTEGER NOT NULL CHECK(member_limit>0)
);
INSERT INTO subscription_plans VALUES ('gratis','Gratis',25,100,3),('pro','Pro',500,1000,10),('negocio','Negocio',5000,10000,30);
ALTER TABLE organizations ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'gratis' CHECK(plan_id IN ('gratis','pro','negocio'));
-- Triggers make quotas atomic, including simultaneous writes and backup imports.
CREATE TRIGGER plan_quotes_insert AFTER INSERT ON quotes WHEN NEW.deleted_at IS NULL BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_QUOTES') WHERE (SELECT COUNT(*) FROM quotes WHERE organization_id=NEW.organization_id AND deleted_at IS NULL)>(SELECT p.quote_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;
CREATE TRIGGER plan_quotes_restore AFTER UPDATE OF deleted_at ON quotes WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_QUOTES') WHERE (SELECT COUNT(*) FROM quotes WHERE organization_id=NEW.organization_id AND deleted_at IS NULL)>(SELECT p.quote_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;
CREATE TRIGGER plan_catalog_insert AFTER INSERT ON catalog_items WHEN NEW.active=1 BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_CATALOG') WHERE (SELECT COUNT(*) FROM catalog_items WHERE organization_id=NEW.organization_id AND active=1)>(SELECT p.catalog_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;
CREATE TRIGGER plan_catalog_activate AFTER UPDATE OF active ON catalog_items WHEN OLD.active=0 AND NEW.active=1 BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_CATALOG') WHERE (SELECT COUNT(*) FROM catalog_items WHERE organization_id=NEW.organization_id AND active=1)>(SELECT p.catalog_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;
CREATE VIEW business_seat_usage AS SELECT o.id AS organization_id,
 (SELECT COUNT(*) FROM memberships m WHERE m.organization_id=o.id) +
 (SELECT COUNT(DISTINCT i.email) FROM team_invitations i WHERE i.organization_id=o.id AND i.accepted_at IS NULL AND i.expires_at>unixepoch() AND NOT EXISTS(SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=o.id AND u.email=i.email)) AS used FROM organizations o;
CREATE TRIGGER plan_members_insert AFTER INSERT ON memberships BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_MEMBERS') WHERE (SELECT used FROM business_seat_usage WHERE organization_id=NEW.organization_id)>(SELECT p.member_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;
CREATE TRIGGER plan_invites_insert AFTER INSERT ON team_invitations WHEN NEW.accepted_at IS NULL AND NEW.expires_at>unixepoch() BEGIN
 SELECT RAISE(ABORT,'QUOTER_LIMIT_MEMBERS') WHERE (SELECT used FROM business_seat_usage WHERE organization_id=NEW.organization_id)>(SELECT p.member_limit FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=NEW.organization_id);
END;

CREATE INDEX idx_catalog_plan_usage ON catalog_items(organization_id,active);
CREATE INDEX idx_members_plan_usage ON memberships(organization_id);
CREATE INDEX idx_invites_plan_usage ON team_invitations(organization_id,accepted_at,expires_at,email);
