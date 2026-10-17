import { businessSubscription } from '../auth/subscription.ts'
import { localPreview,type EmailEnvironment } from '../auth/environment.ts'
import type { Account } from '../auth/session'
import { auditStatement } from '../db/audit.ts'
import { body,HttpError } from '../http.ts'
const columns='p.id,p.name,p.quote_limit AS quoteLimit,p.catalog_limit AS catalogLimit,p.member_limit AS memberLimit'
export async function plans(request:Request,db:D1Database,user:Account,env:EmailEnvironment){
 if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede administrar el plan')
 const preview=localPreview(request,env)
 if(request.method==='PATCH'){
  if(!preview)throw new HttpError(403,'Los cambios de plan de prueba solo están disponibles en el entorno local. El cobro todavía no está habilitado.')
  const data=await body(request)
  if(typeof data.planId!=='string'||!await db.prepare('SELECT id FROM subscription_plans WHERE id=?').bind(data.planId).first())throw new HttpError(400,'Plan inválido')
  await db.batch([db.prepare('UPDATE organizations SET plan_id=? WHERE id=?').bind(data.planId,user.organizationId),auditStatement(db,user,'plan.preview.changed',null,{planId:data.planId})])
 }else if(request.method!=='GET')throw new HttpError(405,'Operación no permitida')
 const org=user.organizationId
 const includeStorage=new URL(request.url).searchParams.get('storage')==='true'
 const result=await db.batch<Record<string,unknown>>([
  db.prepare(`SELECT ${columns} FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=?`).bind(org),
  db.prepare(`SELECT ${columns} FROM subscription_plans p ORDER BY p.quote_limit`),
  db.prepare('SELECT (SELECT COUNT(*) FROM quotes WHERE organization_id=? AND deleted_at IS NULL) AS quotes,(SELECT COUNT(*) FROM catalog_items WHERE organization_id=? AND active=1) AS catalog,(SELECT COUNT(*) FROM memberships WHERE organization_id=?) AS members,(SELECT used FROM business_seat_usage WHERE organization_id=?) AS seats').bind(org,org,org,org),
  ...(includeStorage?[db.prepare(`SELECT
   (SELECT COUNT(*) FROM quotes WHERE organization_id=? AND deleted_at IS NOT NULL) AS trashQuotes,
   (SELECT COUNT(*) FROM catalog_items WHERE organization_id=? AND active=0) AS archivedCatalog,
   (SELECT COUNT(*) FROM customers WHERE organization_id=?) AS customers,
   (SELECT COUNT(*) FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.organization_id=?) AS quoteItems,
   (SELECT COUNT(*) FROM audit_events WHERE organization_id=?) AS auditEvents,
   (SELECT COUNT(*) FROM team_invitations WHERE organization_id=?) AS invitations,
   COALESCE((SELECT SUM(length(CAST(branding_snapshot AS BLOB))) FROM quotes WHERE organization_id=?),0)+COALESCE((SELECT length(CAST(logo AS BLOB)) FROM organizations WHERE id=?),0) AS brandingBytes`).bind(org,org,org,org,org,org,org,org)]:[]),
 ])
 const usage=result[2].results[0]
 const subscription=await businessSubscription(db,org)
 const activations=(await db.prepare('SELECT p.name AS planName,a.created_at AS createdAt,a.period_start AS periodStart,a.period_end AS periodEnd,a.payment_reference AS reference FROM plan_activations a JOIN subscription_plans p ON p.id=a.plan_id WHERE a.organization_id=? ORDER BY a.rowid DESC LIMIT 10').bind(org).all()).results
 return Response.json({businessId:org,subscription,activations,plan:result[0].results[0],plans:result[1].results,usage:{...usage,pendingInvitations:Number(usage.seats)-Number(usage.members)},...(includeStorage?{storage:result[3].results[0]}:{}),preview})
}
