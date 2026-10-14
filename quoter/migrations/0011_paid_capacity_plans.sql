-- Preserve technical IDs and existing business assignments.
UPDATE subscription_plans SET name='Plan 1', quote_limit=25, catalog_limit=15, member_limit=1 WHERE id='gratis';
UPDATE subscription_plans SET name='Plan 2', quote_limit=50, catalog_limit=25, member_limit=3 WHERE id='pro';
UPDATE subscription_plans SET name='Plan 3', quote_limit=100, catalog_limit=50, member_limit=5 WHERE id='negocio';

-- Only trusted database operators write payment confirmations. No public API.
CREATE TABLE plan_activations (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
 payment_reference TEXT NOT NULL UNIQUE,
 operator_email TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER activate_confirmed_plan AFTER INSERT ON plan_activations BEGIN
 INSERT INTO audit_events(id,organization_id,action,actor_email,detail)
 VALUES(NEW.id,NEW.organization_id,'plan.activated.manually',NEW.operator_email,
 json_object('previousPlanId',(SELECT plan_id FROM organizations WHERE id=NEW.organization_id),'planId',NEW.plan_id,'paymentReference',NEW.payment_reference));
 UPDATE organizations SET plan_id=NEW.plan_id WHERE id=NEW.organization_id;
END;
