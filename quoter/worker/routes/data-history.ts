import type { Account } from '../auth/session'
import { auditStatement } from '../db/audit'
import { HttpError } from '../http'
export async function dataHistory(request:Request,db:D1Database,user:Account,path:string) {
 const org=user.organizationId
 const url=new URL(request.url),page=Number(url.searchParams.get('page')||1)
 if(!Number.isInteger(page)||page<1||page>100000)throw new HttpError(400,'Página inválida')
 const paged=url.searchParams.get('paged')==='true'
 if(path==='/api/history'&&request.method==='GET'){
  if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede ver el historial del negocio')
  if(paged){const rows=await db.batch([db.prepare('SELECT COUNT(*) AS total FROM audit_events WHERE organization_id=?').bind(org),db.prepare('SELECT a.id,a.action,a.actor_email AS actorEmail,a.detail,a.created_at AS createdAt,q.quote_number AS quoteNumber FROM audit_events a LEFT JOIN quotes q ON q.id=a.quote_id AND q.organization_id=a.organization_id WHERE a.organization_id=? ORDER BY a.created_at DESC,a.rowid DESC LIMIT 25 OFFSET ?').bind(org,(page-1)*25)]);return Response.json({rows:rows[1].results,total:(rows[0].results[0] as {total:number}).total})}
  return Response.json((await db.prepare('SELECT a.id,a.action,a.actor_email AS actorEmail,a.detail,a.created_at AS createdAt,q.quote_number AS quoteNumber FROM audit_events a LEFT JOIN quotes q ON q.id=a.quote_id AND q.organization_id=a.organization_id WHERE a.organization_id=? ORDER BY a.created_at DESC,a.rowid DESC LIMIT 100').bind(org).all()).results)
 }
 const quoteHistory=/^\/api\/quotes\/([^/]+)\/history$/.exec(path)
 if(quoteHistory&&request.method==='GET'){
  if(!await db.prepare('SELECT id FROM quotes WHERE id=? AND organization_id=? AND deleted_at IS NULL').bind(quoteHistory[1],org).first())throw new HttpError(404,'Cotización no encontrada')
  return Response.json((await db.prepare('SELECT id,action,actor_email AS actorEmail,detail,created_at AS createdAt FROM audit_events WHERE organization_id=? AND quote_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100').bind(org,quoteHistory[1]).all()).results)
 }
 if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede administrar la papelera')
 if(path==='/api/trash'&&request.method==='GET'&&paged){const rows=await db.batch([db.prepare('SELECT COUNT(*) AS total FROM quotes WHERE organization_id=? AND deleted_at IS NOT NULL').bind(org),db.prepare('SELECT q.id,q.quote_number AS quoteNumber,c.name AS customerName,q.total,q.deleted_at AS deletedAt FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=? AND q.deleted_at IS NOT NULL ORDER BY q.deleted_at DESC,q.id DESC LIMIT 25 OFFSET ?').bind(org,(page-1)*25)]);return Response.json({rows:rows[1].results,total:(rows[0].results[0] as {total:number}).total})}
 if(path==='/api/trash'&&request.method==='GET')return Response.json((await db.prepare('SELECT q.id,q.quote_number AS quoteNumber,c.name AS customerName,q.total,q.deleted_at AS deletedAt FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=? AND q.deleted_at IS NOT NULL ORDER BY q.deleted_at DESC,q.id DESC LIMIT 100').bind(org).all()).results)
 const restore=/^\/api\/trash\/([^/]+)\/restore$/.exec(path)
 if(restore&&request.method==='POST'){
  const operation=crypto.randomUUID(),id=restore[1]
  const result=await db.batch([db.prepare('UPDATE quotes SET deleted_at=NULL,updated_at=CURRENT_TIMESTAMP,revision=revision+1,write_token=? WHERE id=? AND organization_id=? AND deleted_at IS NOT NULL').bind(operation,id,org),auditStatement(db,user,'quote.restored',id,{}, {sql:'EXISTS (SELECT 1 FROM quotes WHERE id=? AND organization_id=? AND write_token=?)',values:[id,org,operation]})])
  if(!result[0].meta.changes)throw new HttpError(404,'Cotización no encontrada en la papelera')
  return Response.json({restored:true})
 }
 throw new HttpError(405,'Operación no válida')
}
