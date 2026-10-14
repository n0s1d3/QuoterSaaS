CREATE VIEW platform_permanent_businesses AS
 SELECT u.organization_id AS id FROM platform_admin p JOIN users u ON u.email=p.email
 JOIN memberships m ON m.user_id=u.id AND m.organization_id=u.organization_id AND m.role='owner'
 WHERE u.email_verified_at IS NOT NULL AND u.suspended_at IS NULL;
DROP TRIGGER subscription_customers_insert;
DROP TRIGGER subscription_customers_update;
DROP TRIGGER subscription_customers_delete;
DROP TRIGGER subscription_catalog_items_insert;
DROP TRIGGER subscription_catalog_items_update;
DROP TRIGGER subscription_catalog_items_delete;
DROP TRIGGER subscription_quotes_insert;
DROP TRIGGER subscription_quotes_update;
DROP TRIGGER subscription_quotes_delete;
DROP TRIGGER subscription_memberships_insert;
DROP TRIGGER subscription_memberships_update;
DROP TRIGGER subscription_memberships_delete;
DROP TRIGGER subscription_team_invitations_insert;
DROP TRIGGER subscription_team_invitations_update;
DROP TRIGGER subscription_team_invitations_delete;
DROP TRIGGER subscription_quote_items_insert;
DROP TRIGGER subscription_quote_items_update;
DROP TRIGGER subscription_quote_items_delete;
DROP TRIGGER subscription_branding;
CREATE TRIGGER subscription_customers_insert BEFORE INSERT ON customers
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_customers_update BEFORE UPDATE ON customers
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_customers_delete BEFORE DELETE ON customers
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=OLD.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_insert BEFORE INSERT ON catalog_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_update BEFORE UPDATE ON catalog_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_delete BEFORE DELETE ON catalog_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=OLD.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_insert BEFORE INSERT ON quotes
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_update BEFORE UPDATE ON quotes
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_delete BEFORE DELETE ON quotes
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=OLD.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_insert BEFORE INSERT ON memberships
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_update BEFORE UPDATE ON memberships
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_delete BEFORE DELETE ON memberships
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=OLD.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_insert BEFORE INSERT ON team_invitations
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_update BEFORE UPDATE ON team_invitations
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_delete BEFORE DELETE ON team_invitations
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=OLD.organization_id) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_insert BEFORE INSERT ON quote_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_update BEFORE UPDATE ON quote_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_delete BEFORE DELETE ON quote_items
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=(SELECT organization_id FROM quotes WHERE id=OLD.quote_id)) AND COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=OLD.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_branding BEFORE UPDATE OF name,currency,logo,primary_color,accent_color,tax_id,address,phone,contact_email,payment_terms ON organizations
 WHEN NOT EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=NEW.id) AND COALESCE(NEW.paid_until,NEW.trial_expires_at,0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
