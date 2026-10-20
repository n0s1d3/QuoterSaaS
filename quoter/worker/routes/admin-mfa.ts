import type { PasswordEnvironment } from '../auth/passwords.ts'
import { requirePlatformAdmin,confirmAdmin,adminGate } from '../auth/platform-admin.ts'
import { cookieToken,digest,randomToken,sessionCookie,type Account } from '../auth/session.ts'
import { base32,seal,unseal,validStep } from '../auth/totp.ts'
import { limit } from '../auth/rate-limit.ts'
import { body,HttpError } from '../http.ts'
interface Factor {version:string;sealed:string;pendingUntil:number|null;enabledAt:string|null;lastStep:number}
const factorSql='SELECT version,sealed_secret AS sealed,pending_until AS pendingUntil,enabled_at AS enabledAt,last_step AS lastStep FROM admin_mfa WHERE user_id=?'
export async function requireMfa(db:D1Database,user:Account,request:Request){
 const passed=await db.prepare('SELECT MIN(s.expires_at,s.mfa_verified_until) AS verifiedUntil FROM sessions s JOIN admin_mfa f ON f.user_id=s.user_id WHERE s.token_hash=? AND s.user_id=? AND s.expires_at>unixepoch() AND f.enabled_at IS NOT NULL AND s.mfa_factor_version=f.version AND s.mfa_verified_until>unixepoch()').bind(await digest(cookieToken(request)!),user.id).first<{verifiedUntil:number}>()
 if(!passed)throw new HttpError(403,'Verifica el segundo factor para entrar en Administración')
 return passed.verifiedUntil
}
export async function adminMfa(request:Request,db:D1Database,user:Account,key:string|undefined,env:PasswordEnvironment={}){
 const master=await requirePlatformAdmin(db,user),factor=await db.prepare(factorSql).bind(user.id).first<Factor>(),sessionHash=await digest(cookieToken(request)!),now=Math.floor(Date.now()/1000)
 if(request.method==='GET'){let verifiedUntil:number|null=null;try{verifiedUntil=await requireMfa(db,user,request)}catch(error){if(!(error instanceof HttpError)||error.status!==403)throw error};return Response.json({enabled:!!factor?.enabledAt,verified:verifiedUntil!==null,verifiedUntil,configured:!!key&&/^[a-f0-9]{64}$/i.test(key)})}
 if(request.method!=='POST')throw new HttpError(405,'Operación no permitida')
 const data=await body(request)
 const durationDays=data.durationDays===undefined?0:data.durationDays
 if(durationDays!==0&&durationDays!==90&&durationDays!==180)throw new HttpError(400,'Elige una hora, 90 o 180 días para el acceso 2FA')
 if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new HttpError(503,'Configura MFA_ENCRYPTION_KEY en el servidor antes de activar el segundo factor')
 if(data.action==='setup'){
  if(factor?.enabledAt)throw new HttpError(409,'El segundo factor ya está activado')
  await confirmAdmin(db,user,data.currentPassword,master,env)
  const secret=base32(crypto.getRandomValues(new Uint8Array(20))),sealed=await seal(secret,user.id,key),version=crypto.randomUUID()
  const result=await db.prepare('INSERT INTO admin_mfa(user_id,version,sealed_secret,pending_until) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,sealed_secret=excluded.sealed_secret,pending_until=excluded.pending_until WHERE admin_mfa.enabled_at IS NULL').bind(user.id,version,sealed,now+1200,user.id,master.hash).run()
  if(!result.meta.changes)throw new HttpError(409,'La configuración cambió. Vuelve a intentarlo')
  return Response.json({secret,expiresAt:now+1200,uri:`otpauth://totp/${encodeURIComponent('Quoter:'+user.email)}?secret=${secret}&issuer=Quoter&algorithm=SHA1&digits=6&period=30`})
 }
 if(!factor)throw new HttpError(400,'Configura primero tu aplicación autenticadora')
 await limit(db,`admin-mfa:${user.id}`,10)
 const challenge=crypto.randomUUID()
 const token=randomToken(),tokenHash=await digest(token),extendedUntil=now+durationDays*86400
 // Rotate only the proving session. The transaction rechecks its lifetime, the
 // current account/master designation and the single-use factor proof together.
 const grant=(condition:string,values:unknown[])=>db.prepare(`UPDATE sessions SET token_hash=?,expires_at=CASE WHEN ?=0 THEN MIN(expires_at,?) ELSE ? END,mfa_verified_until=CASE WHEN ?=0 THEN MIN(expires_at,?) ELSE ? END,mfa_factor_version=? WHERE token_hash=? AND user_id=? AND expires_at>unixepoch() AND ${adminGate} AND ${condition}`).bind(tokenHash,durationDays,now+604800,extendedUntil,durationDays,now+3600,extendedUntil,factor.version,sessionHash,user.id,user.id,master.hash,...values)
 async function granted(recoveryCodes?:string[]){
  const session=await db.prepare('SELECT expires_at AS expiresAt,mfa_verified_until AS verifiedUntil FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>unixepoch()').bind(tokenHash,user.id).first<{expiresAt:number;verifiedUntil:number}>()
  if(!session)throw new HttpError(401,'Tu sesión fue revocada. Inicia sesión nuevamente')
  return Response.json({verified:true,verifiedUntil:session.verifiedUntil,...(recoveryCodes?{recoveryCodes}:{})},{headers:{'Set-Cookie':sessionCookie(request,token,session.expiresAt-Math.floor(Date.now()/1000))}})
 }
 if(data.action==='confirm'){
  if(factor.enabledAt||!factor.pendingUntil||factor.pendingUntil<=now)throw new HttpError(400,'La configuración venció o ya fue confirmada')
  await confirmAdmin(db,user,data.currentPassword,master,env)
  const step=await validStep(await unseal(factor.sealed,user.id,key),data.code,factor.lastStep)
  if(step===null)throw new HttpError(403,'Código incorrecto o ya utilizado')
  const codes=Array.from({length:8},()=>randomToken().slice(0,32)),hashes=await Promise.all(codes.map(digest))
  const condition='EXISTS(SELECT 1 FROM admin_mfa WHERE user_id=? AND version=? AND last_challenge=?)',values=[user.id,factor.version,challenge]
  const rows=await db.batch([db.prepare('UPDATE admin_mfa SET enabled_at=CURRENT_TIMESTAMP,pending_until=NULL,last_step=?,last_challenge=? WHERE user_id=? AND version=? AND enabled_at IS NULL AND pending_until>unixepoch() AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)').bind(step,challenge,user.id,factor.version,user.id,master.hash),...hashes.map(hash=>db.prepare(`INSERT INTO admin_mfa_recovery(user_id,code_hash) SELECT ?,? WHERE ${condition}`).bind(user.id,hash,...values)),grant(condition,values),db.prepare(`INSERT INTO platform_audit(id,actor_id,action,target_type,target_id,detail) SELECT ?,?,'mfa.enabled','account',?,'{}' WHERE ${condition}`).bind(challenge,user.id,user.id,...values)])
  if(!rows[0].meta.changes||!rows[hashes.length+1].meta.changes)throw new HttpError(409,'La configuración cambió. Vuelve a intentarlo')
  return granted(codes)
 }
 if(data.action!=='verify'||!factor.enabledAt)throw new HttpError(400,'Operación de segundo factor inválida')
 let consume:D1PreparedStatement,condition:string,values:unknown[]
 if(typeof data.code==='string'&&/^[a-f0-9]{32}$/i.test(data.code)){
  const hash=await digest(data.code.toLowerCase());consume=db.prepare('UPDATE admin_mfa_recovery SET consumed_by=? WHERE user_id=? AND code_hash=? AND consumed_by IS NULL').bind(challenge,user.id,hash)
  condition='EXISTS(SELECT 1 FROM admin_mfa_recovery r JOIN admin_mfa f ON f.user_id=r.user_id WHERE r.user_id=? AND r.consumed_by=? AND f.version=?)';values=[user.id,challenge,factor.version]
 }else{
  const step=await validStep(await unseal(factor.sealed,user.id,key),data.code,factor.lastStep)
  if(step===null)throw new HttpError(403,'Código incorrecto o ya utilizado')
  consume=db.prepare('UPDATE admin_mfa SET last_step=?,last_challenge=? WHERE user_id=? AND version=? AND last_step<? AND enabled_at IS NOT NULL').bind(step,challenge,user.id,factor.version,step)
  condition='EXISTS(SELECT 1 FROM admin_mfa WHERE user_id=? AND version=? AND last_challenge=?)';values=[user.id,factor.version,challenge]
 }
 const audit=db.prepare(`INSERT INTO platform_audit(id,actor_id,action,target_type,target_id,detail) SELECT ?,?,'mfa.session.verified','account',?,? WHERE ${condition}`).bind(challenge,user.id,user.id,JSON.stringify({durationDays}),...values)
 // No guarded writes may follow rotation: the request's original token is gone.
 const rows=await db.batch([consume,db.prepare(`DELETE FROM auth_limits WHERE key=? AND ${condition}`).bind(await digest(`admin-mfa:${user.id}`),...values),audit,grant(condition,values)])
 if(!rows[0].meta.changes||!rows[3].meta.changes)throw new HttpError(403,'Código incorrecto o ya utilizado')
 return granted()
}
