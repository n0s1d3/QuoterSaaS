-- Old activations granted exactly one month. Unknown historical prices stay NULL.
ALTER TABLE plan_activations ADD COLUMN duration_months INTEGER NOT NULL DEFAULT 1
 CHECK (duration_months IN (1,3,6,12));
ALTER TABLE plan_activations ADD COLUMN tariff_cents INTEGER
 CHECK (tariff_cents IS NULL OR (typeof(tariff_cents)='integer' AND tariff_cents>=0));

DROP TRIGGER activate_confirmed_plan;
CREATE TRIGGER activate_confirmed_plan AFTER INSERT ON plan_activations BEGIN
 UPDATE plan_activations SET period_start=(SELECT MAX(unixepoch(),COALESCE(paid_until,0),COALESCE(trial_expires_at,0)) FROM organizations WHERE id=NEW.organization_id) WHERE id=NEW.id;
 -- Add the purchased calendar interval once, clamping the original day to the
 -- final month's last day. Jan 31 + 3 months = Apr 30, not Apr 28.
 UPDATE plan_activations SET period_end=
  CAST(strftime('%s',period_start-21600,'unixepoch','start of month','+'||NEW.duration_months||' months') AS INTEGER)
  +(MIN(CAST(strftime('%d',period_start-21600,'unixepoch') AS INTEGER),CAST(strftime('%d',period_start-21600,'unixepoch','start of month','+'||(NEW.duration_months+1)||' months','-1 day') AS INTEGER))-1)*86400
  +((period_start-21600)%86400)+21600
 WHERE id=NEW.id;
 INSERT INTO audit_events(id,organization_id,action,actor_email,detail)
 SELECT NEW.id,NEW.organization_id,'plan.activated.manually',NEW.operator_email,
 json_object('previousPlanId',(SELECT plan_id FROM organizations WHERE id=NEW.organization_id),'planId',NEW.plan_id,'paymentReference',NEW.payment_reference,'periodStart',period_start,'periodEnd',period_end,'durationMonths',NEW.duration_months)
 FROM plan_activations WHERE id=NEW.id;
 UPDATE organizations SET plan_id=NEW.plan_id,paid_until=(SELECT period_end FROM plan_activations WHERE id=NEW.id) WHERE id=NEW.organization_id;
END;
