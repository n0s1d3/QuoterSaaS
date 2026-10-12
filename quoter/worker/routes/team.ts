import { body,HttpError,text } from '../http'
import { account,cookieToken,digest,randomToken } from '../auth/session'
import type { Account } from '../auth/session'
import type { EmailEnvironment } from '../auth/environment'
import { mailReady,sendAccountEmail } from '../auth/mail'
import { limit } from '../auth/rate-limit'
export async function businesses(request:Request,db:D1Database,user:Account,path:string) {
 if(path==='/api/businesses'&&request.method==='GET')return Response.json((await db.prepare('SELECT o.id,o.name,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=? ORDER BY o.name').bind(user.id).all()).results)
 if(path!=='/api/businesses/switch'||request.method!=='POST')throw new HttpError(405,'Method not allowed')
 const data=await body(request),org=text(data.organizationId,'Business',true,100)
 const result=await db.prepare('UPDATE sessions SET organization_id=? WHERE token_hash=? AND user_id=? AND EXISTS(SELECT 1 FROM memberships WHERE user_id=? AND organization_id=?)').bind(org,await digest(cookieToken(request)!),user.id,user.id,org).run()
 if(!result.meta.changes)throw new HttpError(403,'No tienes acceso a ese negocio')
 return Response.json(await account(request,db))
}
export async function previewInvitation(request:Request,db:D1Database,user:Account) {
 if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
 await limit(db,`invite-preview:${user.id}`,40)
 const data=await body(request)
 if(typeof data.token!=='string'||!/^[a-f0-9]{64}$/.test(data.token))throw new HttpError(400,'Invitación inválida')
 const invitation=await db.prepare('SELECT i.email,i.role,i.expires_at AS expiresAt,o.name AS businessName FROM team_invitations i JOIN organizations o ON o.id=i.organization_id WHERE i.token_hash=? AND i.expires_at>? AND i.accepted_at IS NULL').bind(await digest(data.token),Math.floor(Date.now()/1000)).first<{email:string;role:string;expiresAt:number;businessName:string}>()
 if(!invitation)throw new HttpError(400,'Invitación vencida o utilizada')
 if(invitation.email!==user.email)throw new HttpError(403,'Inicia sesión con el correo al que se envió la invitación')
 return Response.json({businessName:invitation.businessName,role:invitation.role,expiresAt:invitation.expiresAt})
}
export async function acceptInvitation(request:Request,db:D1Database,user:Account) {
 if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
 await limit(db,`invite-accept:${user.id}`,20)
 const data=await body(request)
 if(typeof data.token!=='string'||!/^[a-f0-9]{64}$/.test(data.token))throw new HttpError(400,'Invitación inválida')
 const hash=await digest(data.token),nonce=randomToken(),now=Math.floor(Date.now()/1000)
 const invitation=await db.prepare('SELECT email FROM team_invitations WHERE token_hash=? AND expires_at>? AND accepted_at IS NULL').bind(hash,now).first<{email:string}>()
 if(!invitation)throw new HttpError(400,'Invitación vencida o utilizada')
 if(invitation.email!==user.email)throw new HttpError(403,'Inicia sesión con el correo al que se envió la invitación')
 const results=await db.batch([
  db.prepare('UPDATE team_invitations SET accepted_at=?,consumption_id=? WHERE token_hash=? AND email=? AND accepted_at IS NULL AND expires_at>?').bind(now,nonce,hash,user.email,now),
  db.prepare('INSERT INTO memberships (user_id,organization_id,role) SELECT ?,organization_id,role FROM team_invitations WHERE token_hash=? AND consumption_id=? ON CONFLICT(user_id,organization_id) DO NOTHING').bind(user.id,hash,nonce),
  db.prepare('UPDATE sessions SET organization_id=(SELECT organization_id FROM team_invitations WHERE token_hash=? AND consumption_id=?) WHERE token_hash=? AND user_id=? AND EXISTS(SELECT 1 FROM team_invitations WHERE token_hash=? AND consumption_id=?)').bind(hash,nonce,await digest(cookieToken(request)!),user.id,hash,nonce),
 ])
 if(!results[0].meta.changes)throw new HttpError(400,'Invitación vencida o utilizada')
 return Response.json(await account(request,db))
}
export async function team(request:Request,db:D1Database,user:Account,path:string,env:EmailEnvironment) {
 const org=user.organizationId
 if(path==='/api/team'&&request.method==='GET')return Response.json({members:(await db.prepare('SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? ORDER BY u.email').bind(org).all()).results,invitations:(await db.prepare('SELECT id,email,role,expires_at AS expiresAt FROM team_invitations WHERE organization_id=? AND accepted_at IS NULL AND expires_at>?').bind(org,Math.floor(Date.now()/1000)).all()).results})
 const member=/^\/api\/team\/members\/([^/]+)$/.exec(path)
 if(member) {
  if(request.method!=='PATCH'&&request.method!=='DELETE')throw new HttpError(405,'Method not allowed')
  const target=decodeURIComponent(member[1])
  const membership=await db.prepare('SELECT role FROM memberships WHERE organization_id=? AND user_id=?').bind(org,target).first<{role:string}>()
  if(!membership)throw new HttpError(404,'Miembro no encontrado')
  if(membership.role==='owner'||target===user.id)throw new HttpError(400,'El propietario no puede perder su acceso')
  if(request.method==='PATCH'){const data=await body(request);if(!['editor','viewer'].includes(data.role as string))throw new HttpError(400,'Rol inválido');await db.prepare("UPDATE memberships SET role=? WHERE organization_id=? AND user_id=? AND role!='owner'").bind(data.role,org,target).run()}
  else await db.batch([db.prepare("DELETE FROM memberships WHERE organization_id=? AND user_id=? AND role!='owner'").bind(org,target),db.prepare('DELETE FROM sessions WHERE user_id=? AND organization_id=?').bind(target,org)])
  return Response.json({updated:true})
 }
 const invitation=/^\/api\/team\/invitations\/([^/]+)$/.exec(path)
 if(invitation&&request.method==='DELETE'){const result=await db.prepare('DELETE FROM team_invitations WHERE id=? AND organization_id=? AND accepted_at IS NULL').bind(decodeURIComponent(invitation[1]),org).run();if(!result.meta.changes)throw new HttpError(404,'Invitación no encontrada');return Response.json({revoked:true})}
 if(path!=='/api/team/invitations'||request.method!=='POST')throw new HttpError(405,'Method not allowed')
 await limit(db,`team-invite:${org}`,20)
 const data=await body(request),email=text(data.email,'Correo',true,254)!.toLowerCase()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['editor','viewer'].includes(data.role as string))throw new HttpError(400,'Correo o rol inválido')
 if(await db.prepare('SELECT m.user_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? AND u.email=?').bind(org,email).first())throw new HttpError(409,'Esta cuenta ya pertenece al equipo')
 mailReady(request,env)
 const id=crypto.randomUUID(),token=randomToken(),expires=Math.floor(Date.now()/1000)+259200
 await db.batch([db.prepare('DELETE FROM team_invitations WHERE organization_id=? AND email=? AND accepted_at IS NULL').bind(org,email),db.prepare('INSERT INTO team_invitations (id,organization_id,email,role,token_hash,expires_at) VALUES (?,?,?,?,?,?)').bind(id,org,email,data.role,await digest(token),expires)])
 const delivery=await sendAccountEmail(request,env,email,'invite',token)
 return Response.json({id,email,role:data.role,expiresAt:expires,...delivery},{status:201})
}
