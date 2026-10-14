-- Existing businesses receive a fresh transition period; no data is removed.
ALTER TABLE organizations ADD COLUMN trial_expires_at INTEGER;
ALTER TABLE organizations ADD COLUMN paid_until INTEGER;
UPDATE organizations SET trial_expires_at=unixepoch()+604800;
UPDATE organizations SET paid_until=CAST(strftime('%s', ((unixepoch())-21600), 'unixepoch', 'start of month', '+1 month') AS INTEGER) + (MIN(CAST(strftime('%d', ((unixepoch())-21600), 'unixepoch') AS INTEGER), CAST(strftime('%d', ((unixepoch())-21600), 'unixepoch', 'start of month', '+2 months', '-1 day') AS INTEGER))-1)*86400 + ((((unixepoch())-21600))%86400) + 21600
 WHERE EXISTS(SELECT 1 FROM plan_activations a WHERE a.organization_id=organizations.id);
ALTER TABLE plan_activations ADD COLUMN period_start INTEGER;
ALTER TABLE plan_activations ADD COLUMN period_end INTEGER;
CREATE TRIGGER new_business_trial AFTER INSERT ON organizations BEGIN
 UPDATE organizations SET trial_expires_at=unixepoch()+604800 WHERE id=NEW.id AND trial_expires_at IS NULL;
END;
DROP TRIGGER activate_confirmed_plan;
CREATE TRIGGER activate_confirmed_plan AFTER INSERT ON plan_activations BEGIN
 UPDATE plan_activations SET period_start=(SELECT MAX(unixepoch(),COALESCE(paid_until,0),COALESCE(trial_expires_at,0)) FROM organizations WHERE id=NEW.organization_id) WHERE id=NEW.id;
 UPDATE plan_activations SET period_end=CAST(strftime('%s', ((period_start)-21600), 'unixepoch', 'start of month', '+1 month') AS INTEGER) + (MIN(CAST(strftime('%d', ((period_start)-21600), 'unixepoch') AS INTEGER), CAST(strftime('%d', ((period_start)-21600), 'unixepoch', 'start of month', '+2 months', '-1 day') AS INTEGER))-1)*86400 + ((((period_start)-21600))%86400) + 21600 WHERE id=NEW.id;
 INSERT INTO audit_events(id,organization_id,action,actor_email,detail)
 SELECT NEW.id,NEW.organization_id,'plan.activated.manually',NEW.operator_email,
 json_object('previousPlanId',(SELECT plan_id FROM organizations WHERE id=NEW.organization_id),'planId',NEW.plan_id,'paymentReference',NEW.payment_reference,'periodStart',period_start,'periodEnd',period_end)
 FROM plan_activations WHERE id=NEW.id;
 UPDATE organizations SET plan_id=NEW.plan_id,paid_until=(SELECT period_end FROM plan_activations WHERE id=NEW.id) WHERE id=NEW.organization_id;
END;
CREATE TRIGGER subscription_customers_insert BEFORE INSERT ON customers
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_customers_update BEFORE UPDATE ON customers
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_customers_delete BEFORE DELETE ON customers
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_insert BEFORE INSERT ON catalog_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_update BEFORE UPDATE ON catalog_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_catalog_items_delete BEFORE DELETE ON catalog_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_insert BEFORE INSERT ON quotes
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_update BEFORE UPDATE ON quotes
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quotes_delete BEFORE DELETE ON quotes
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_insert BEFORE INSERT ON memberships
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_update BEFORE UPDATE ON memberships
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_memberships_delete BEFORE DELETE ON memberships
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_insert BEFORE INSERT ON team_invitations
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_update BEFORE UPDATE ON team_invitations
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=NEW.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_team_invitations_delete BEFORE DELETE ON team_invitations
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=OLD.organization_id),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_insert BEFORE INSERT ON quote_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_update BEFORE UPDATE ON quote_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=NEW.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_quote_items_delete BEFORE DELETE ON quote_items
 WHEN COALESCE((SELECT COALESCE(paid_until,trial_expires_at,0) FROM organizations WHERE id=(SELECT organization_id FROM quotes WHERE id=OLD.quote_id)),0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
CREATE TRIGGER subscription_branding BEFORE UPDATE OF name,currency,logo,primary_color,accent_color,tax_id,address,phone,contact_email,payment_terms ON organizations
 WHEN COALESCE(NEW.paid_until,NEW.trial_expires_at,0)<=unixepoch()
 BEGIN SELECT RAISE(ABORT,'QUOTER_SUBSCRIPTION_EXPIRED'); END;
