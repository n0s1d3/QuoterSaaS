import type { PasswordEnvironment } from '../auth/passwords.ts'
import { requirePlatformAdmin,confirmAdmin,adminGate } from '../auth/platform-admin.ts'
import type { Account } from '../auth/session'
import { body,HttpError,text } from '../http.ts'
import { businessSubscription } from '../auth/subscription.ts'
const state="CASE WHEN o.suspended_at IS NOT NULL THEN 'suspended' WHEN EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=o.id) THEN 'permanent' WHEN COALESCE(o.paid_until,o.trial_expires_at,0)<=unixepoch() THEN 'expired' WHEN o.paid_until IS NOT NULL THEN 'active' ELSE 'trial' END"
const businessFields=`o.id,o.name,o.currency,unixepoch() AS serverNow,EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=o.id) AS permanent,o.created_at AS createdAt,o.plan_id AS planId,p.name AS planName,o.trial_expires_at AS trialExpiresAt,o.paid_until AS paidUntil,o.suspended_at AS suspendedAt,${state} AS status`
function search(value:string){return '%'+value.replaceAll('\\','\\\\').replaceAll('%','\\%').replaceAll('_','\\_')+'%'}
export async function platformAdmin(request:Request,db:D1Database,user:Account,path:string,env:PasswordEnvironment={}){
 const master=await requirePlatformAdmin(db,user)
 const url=new URL(request.url),page=Number(url.searchParams.get('page')||1),query=url.searchParams.get('search')||''
 if(!Number.isInteger(page)||page<1||page>100000||query.length>200)throw new HttpError(400,'Filtro inválido')
 const offset=(page-1)*25
 if(request.method==='GET'){
  if(path==='/api/admin/overview'){
   const rows=await db.batch<Record<string,unknown>>([
    db.prepare('SELECT COUNT(*) AS total,SUM(suspended_at IS NULL) AS enabled,SUM(suspended_at IS NOT NULL) AS disabled FROM users'),
    db.prepare(`SELECT ${state} AS status,COUNT(*) AS count FROM organizations o GROUP BY status`),
    db.prepare('SELECT id,name,quote_limit AS quoteLimit,catalog_limit AS catalogLimit,member_limit AS memberLimit FROM subscription_plans ORDER BY quote_limit'),
   ]);return Response.json({accounts:rows[0].results[0],businesses:rows[1].results,plans:rows[2].results})
  }
  if(path==='/api/admin/businesses'){
   const condition="(o.name LIKE ? ESCAPE '\\' OR o.id LIKE ? ESCAPE '\\')",term=search(query)
   const rows=await db.batch<Record<string,unknown>>([db.prepare(`SELECT COUNT(*) AS total FROM organizations o WHERE ${condition}`).bind(term,term),db.prepare(`SELECT ${businessFields},(SELECT json_group_array(json_object('id',m.user_id,'role',m.role)) FROM memberships m WHERE m.organization_id=o.id) AS accounts FROM organizations o JOIN subscription_plans p ON p.id=o.plan_id WHERE ${condition} ORDER BY o.created_at DESC,o.id LIMIT 25 OFFSET ?`).bind(term,term,offset)])
   return Response.json({total:(rows[0].results[0] as {total:number}).total,rows:rows[1].results.map(row=>({...row,accounts:JSON.parse(row.accounts as string)}))})
  }
  if(path==='/api/admin/accounts'){
   const term=search(query),condition="(u.id LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id AND o.name LIKE ? ESCAPE '\\'))"
   const rows=await db.batch<Record<string,unknown>>([db.prepare(`SELECT COUNT(*) AS total FROM users u WHERE ${condition}`).bind(term,term),db.prepare(`SELECT u.id,u.created_at AS createdAt,(u.email_verified_at IS NOT NULL) AS verified,u.suspended_at AS suspendedAt,EXISTS(SELECT 1 FROM platform_admin p WHERE p.email=u.email) AS isMaster,(SELECT json_group_array(json_object('id',o.id,'name',o.name,'role',m.role)) FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id) AS businesses FROM users u WHERE ${condition} ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET ?`).bind(term,term,offset)])
   return Response.json({total:(rows[0].results[0] as {total:number}).total,rows:rows[1].results.map(row=>({...row,verified:!!row.verified,isMaster:!!row.isMaster,businesses:JSON.parse(row.businesses as string)}))})
  }
  if(path==='/api/admin/history'){
   const rows=await db.batch<Record<string,unknown>>([db.prepare('SELECT COUNT(*) AS total FROM platform_audit'),db.prepare("SELECT id,actor_id AS actorId,action,target_type AS targetType,target_id AS targetId,created_at AS createdAt,json_extract(detail,'$.planId') AS planId,json_extract(detail,'$.enabled') AS enabled FROM platform_audit ORDER BY created_at DESC,rowid DESC LIMIT 25 OFFSET ?").bind(offset)])
   return Response.json({total:(rows[0].results[0] as {total:number}).total,rows:rows[1].results})
  }
  throw new HttpError(404,'Ruta administrativa no encontrada')
 }
 if(!['POST','PATCH'].includes(request.method))throw new HttpError(405,'Operación no permitida')
 const data=await body(request);await confirmAdmin(db,user,data.currentPassword,master,env)
 const operation=crypto.randomUUID(),gateValues=[user.id,master.hash]
 const audit=(action:string,targetType:string,targetId:string,detail:Record<string,unknown>,extra='1',extraValues:unknown[]=[])=>db.prepare(`INSERT INTO platform_audit(id,actor_id,action,target_type,target_id,detail) SELECT ?,?,?,?,?,? WHERE ${adminGate} AND ${extra}`).bind(operation,user.id,action,targetType,targetId,JSON.stringify(detail),...gateValues,...extraValues)
 const account=/^\/api\/admin\/accounts\/([^/]+)$/.exec(path)
 if(account&&request.method==='PATCH'){
  const id=decodeURIComponent(account[1]);if(typeof data.enabled!=='boolean')throw new HttpError(400,'Indica activar o desactivar')
  const target=await db.prepare('SELECT id,EXISTS(SELECT 1 FROM platform_admin p WHERE p.email=users.email) AS isMaster FROM users WHERE id=?').bind(id).first<{id:string;isMaster:number}>()
  if(!target)throw new HttpError(404,'Cuenta no encontrada');if(target.isMaster||id===user.id)throw new HttpError(400,'La cuenta maestra no puede desactivarse desde el panel')
  const rows=await db.batch<Record<string,unknown>>([db.prepare(`UPDATE users SET suspended_at=${data.enabled?'NULL':'CURRENT_TIMESTAMP'} WHERE id=? AND email<>(SELECT email FROM platform_admin WHERE id=1) AND ${adminGate}`).bind(id,...gateValues),...(!data.enabled?[db.prepare(`DELETE FROM sessions WHERE user_id=? AND ${adminGate}`).bind(id,...gateValues)]:[]),audit(data.enabled?'account.enabled':'account.disabled','account',id,{enabled:data.enabled})])
  if(!rows[0].meta.changes)throw new HttpError(403,'La autorización administrativa cambió. Recarga la sesión.')
  return Response.json({updated:true})
 }
 const business=/^\/api\/admin\/businesses\/([^/]+)(?:\/(activate))?$/.exec(path)
 if(business){
  const id=decodeURIComponent(business[1]);if(!await db.prepare('SELECT id FROM organizations WHERE id=?').bind(id).first())throw new HttpError(404,'Negocio no encontrado')
  if(!business[2]&&request.method==='PATCH'){
   if(typeof data.enabled!=='boolean')throw new HttpError(400,'Indica activar o suspender')
   const rows=await db.batch<Record<string,unknown>>([db.prepare(`UPDATE organizations SET suspended_at=${data.enabled?'NULL':'CURRENT_TIMESTAMP'} WHERE id=? AND ${adminGate}`).bind(id,...gateValues),audit(data.enabled?'business.enabled':'business.suspended','business',id,{enabled:data.enabled})])
   if(!rows[0].meta.changes)throw new HttpError(403,'La autorización administrativa cambió. Recarga la sesión.')
   return Response.json({updated:true,subscription:await businessSubscription(db,id)})
  }
  if(business[2]&&request.method==='POST'){
   const reference=text(data.reference,'Referencia única de pago',true,200)!,planId=text(data.planId,'Plan',true,100)!
   if(!await db.prepare('SELECT id FROM subscription_plans WHERE id=?').bind(planId).first())throw new HttpError(400,'Plan inválido')
   const earlyDowngrade=await db.prepare(`SELECT o.id FROM organizations o JOIN subscription_plans current_plan ON current_plan.id=o.plan_id JOIN subscription_plans next_plan ON next_plan.id=? WHERE o.id=? AND o.paid_until>unixepoch() AND (next_plan.quote_limit<current_plan.quote_limit OR next_plan.catalog_limit<current_plan.catalog_limit OR next_plan.member_limit<current_plan.member_limit) AND NOT EXISTS(SELECT 1 FROM plan_activations WHERE payment_reference=?)`).bind(planId,id,reference).first()
   if(earlyDowngrade)throw new HttpError(409,'El plan pagado actual sigue vigente. Para reducir capacidad, espera a su vencimiento; no se registró el pago ni se cambió el plan.')
   const rows=await db.batch<Record<string,unknown>>([db.prepare(`INSERT INTO plan_activations(id,organization_id,plan_id,payment_reference,operator_email) SELECT ?,?,?,?,'Administración de Quoter' WHERE ${adminGate} ON CONFLICT(payment_reference) DO NOTHING`).bind(operation,id,planId,reference,...gateValues),audit('plan.month.activated','business',id,{planId},'EXISTS(SELECT 1 FROM plan_activations WHERE id=?)',[operation])])
   await requirePlatformAdmin(db,user)
   const receipt=await db.prepare('SELECT organization_id AS businessId,plan_id AS planId FROM plan_activations WHERE payment_reference=?').bind(reference).first<{businessId:string;planId:string}>()
   if(!receipt)throw new HttpError(403,'La autorización administrativa cambió. Recarga la sesión.')
   if(receipt.businessId!==id||receipt.planId!==planId)throw new HttpError(409,'La referencia ya se utilizó para otro negocio o plan. No se realizó ningún cambio.')
   return Response.json({activated:true,reused:!rows[0].meta.changes,subscription:await businessSubscription(db,id)})
  }
 }
 throw new HttpError(404,'Operación administrativa no encontrada')
}
