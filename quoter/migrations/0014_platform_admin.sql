ALTER TABLE users ADD COLUMN suspended_at TEXT;
ALTER TABLE organizations ADD COLUMN suspended_at TEXT;
-- Provisioned only by a trusted operator; it can precede account registration.
CREATE TABLE platform_admin (
 id INTEGER PRIMARY KEY CHECK(id=1),
 email TEXT NOT NULL UNIQUE,
 configured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE platform_audit (
 id TEXT PRIMARY KEY,
 actor_id TEXT,
 action TEXT NOT NULL,
 target_type TEXT NOT NULL,
 target_id TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX platform_audit_time ON platform_audit(created_at);
CREATE TRIGGER platform_customers_insert BEFORE INSERT ON customers
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_customers_update BEFORE UPDATE ON customers
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_customers_delete BEFORE DELETE ON customers
 WHEN (SELECT suspended_at FROM organizations WHERE id=OLD.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_catalog_items_insert BEFORE INSERT ON catalog_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_catalog_items_update BEFORE UPDATE ON catalog_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_catalog_items_delete BEFORE DELETE ON catalog_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=OLD.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quotes_insert BEFORE INSERT ON quotes
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quotes_update BEFORE UPDATE ON quotes
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quotes_delete BEFORE DELETE ON quotes
 WHEN (SELECT suspended_at FROM organizations WHERE id=OLD.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_memberships_insert BEFORE INSERT ON memberships
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_memberships_update BEFORE UPDATE ON memberships
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_memberships_delete BEFORE DELETE ON memberships
 WHEN (SELECT suspended_at FROM organizations WHERE id=OLD.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_team_invitations_insert BEFORE INSERT ON team_invitations
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_team_invitations_update BEFORE UPDATE ON team_invitations
 WHEN (SELECT suspended_at FROM organizations WHERE id=NEW.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_team_invitations_delete BEFORE DELETE ON team_invitations
 WHEN (SELECT suspended_at FROM organizations WHERE id=OLD.organization_id) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quote_items_insert BEFORE INSERT ON quote_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quote_items_update BEFORE UPDATE ON quote_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_quote_items_delete BEFORE DELETE ON quote_items
 WHEN (SELECT suspended_at FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=OLD.quote_id)) IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
CREATE TRIGGER platform_branding BEFORE UPDATE OF name,currency,logo,primary_color,accent_color,tax_id,address,phone,contact_email,payment_terms ON organizations
 WHEN NEW.suspended_at IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'QUOTER_BUSINESS_SUSPENDED'); END;
