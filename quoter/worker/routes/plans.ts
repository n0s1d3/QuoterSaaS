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
 const result=await db.batch<Record<string,unknown>>([
  db.prepare(`SELECT ${columns} FROM subscription_plans p JOIN organizations o ON o.plan_id=p.id WHERE o.id=?`).bind(org),
  db.prepare(`SELECT ${columns} FROM subscription_plans p ORDER BY p.quote_limit`),
  db.prepare('SELECT (SELECT COUNT(*) FROM quotes WHERE organization_id=? AND deleted_at IS NULL) AS quotes,(SELECT COUNT(*) FROM catalog_items WHERE organization_id=? AND active=1) AS catalog,(SELECT COUNT(*) FROM memberships WHERE organization_id=?) AS members,(SELECT used FROM business_seat_usage WHERE organization_id=?) AS seats').bind(org,org,org,org),
 ])
 const usage=result[2].results[0]
 return Response.json({businessId:org,plan:result[0].results[0],plans:result[1].results,usage:{...usage,pendingInvitations:Number(usage.seats)-Number(usage.members)},preview})
}
