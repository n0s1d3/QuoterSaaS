-- Keep paid capacity until its existing period ends. Downgrades are deliberately
-- rejected rather than silently reducing a paid plan before the new period.
-- This also protects trusted CLI activations; HTTP checks alone are insufficient.
CREATE TRIGGER reject_early_paid_downgrade BEFORE INSERT ON plan_activations
 WHEN NOT EXISTS(SELECT 1 FROM plan_activations WHERE payment_reference=NEW.payment_reference)
 AND EXISTS(
  SELECT 1 FROM organizations o
  JOIN subscription_plans current_plan ON current_plan.id=o.plan_id
  JOIN subscription_plans next_plan ON next_plan.id=NEW.plan_id
  WHERE o.id=NEW.organization_id AND o.paid_until>unixepoch()
  AND (next_plan.quote_limit<current_plan.quote_limit
   OR next_plan.catalog_limit<current_plan.catalog_limit
   OR next_plan.member_limit<current_plan.member_limit)
 )
 BEGIN SELECT RAISE(ABORT,'QUOTER_PLAN_DOWNGRADE_ACTIVE'); END;
