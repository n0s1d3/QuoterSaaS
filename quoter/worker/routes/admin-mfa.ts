import { requirePlatformAdmin,confirmAdmin } from '../auth/platform-admin.ts'
import { cookieToken,digest,randomToken,type Account } from '../auth/session.ts'
import { base32,seal,unseal,validStep } from '../auth/totp.ts'
import { limit } from '../auth/rate-limit.ts'
import { body,HttpError } from '../http.ts'
interface Factor {version:string;sealed:string;pendingUntil:number|null;enabledAt:string|null;lastStep:number}
const factorSql='SELECT version,sealed_secret AS sealed,pending_until AS pendingUntil,enabled_at AS enabledAt,last_step AS lastStep FROM admin_mfa WHERE user_id=?'
export async function requireMfa(db:D1Database,user:Account,request:Request){
 const passed=await db.prepare('SELECT 1 FROM sessions s JOIN admin_mfa f ON f.user_id=s.user_id WHERE s.token_hash=? AND s.user_id=? AND f.enabled_at IS NOT NULL AND s.mfa_factor_version=f.version AND s.mfa_verified_until>unixepoch()').bind(await digest(cookieToken(request)!),user.id).first()
 if(!passed)throw new HttpError(403,'Verifica el segundo factor para entrar en Administración')
}
export async function adminMfa(request:Request,db:D1Database,user:Account,key:string|undefined){
 const master=await requirePlatformAdmin(db,user),factor=await db.prepare(factorSql).bind(user.id).first<Factor>(),sessionHash=await digest(cookieToken(request)!),now=Math.floor(Date.now()/1000)
 if(request.method==='GET'){let verified=false;try{await requireMfa(db,user,request);verified=true}catch{};return Response.json({enabled:!!factor?.enabledAt,verified,configured:!!key&&/^[a-f0-9]{64}$/i.test(key)})}
 if(request.method!=='POST')throw new HttpError(405,'Operación no permitida')
 const data=await body(request)
 if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new HttpError(503,'Configura MFA_ENCRYPTION_KEY en el servidor antes de activar el segundo factor')
 if(data.action==='setup'){
  if(factor?.enabledAt)throw new HttpError(409,'El segundo factor ya está activado')
  await confirmAdmin(db,user,data.currentPassword,master)
  const secret=base32(crypto.getRandomValues(new Uint8Array(20))),sealed=await seal(secret,user.id,key),version=crypto.randomUUID()
  const result=await db.prepare('INSERT INTO admin_mfa(user_id,version,sealed_secret,pending_until) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,sealed_secret=excluded.sealed_secret,pending_until=excluded.pending_until WHERE admin_mfa.enabled_at IS NULL').bind(user.id,version,sealed,now+1200,user.id,master.hash).run()
  if(!result.meta.changes)throw new HttpError(409,'La configuración cambió. Vuelve a intentarlo')
  return Response.json({secret,expiresAt:now+1200,uri:`otpauth://totp/${encodeURIComponent('Quoter:'+user.email)}?secret=${secret}&issuer=Quoter&algorithm=SHA1&digits=6&period=30`})
 }
 if(!factor)throw new HttpError(400,'Configura primero tu aplicación autenticadora')
 await limit(db,`admin-mfa:${user.id}`,10)
 const challenge=crypto.randomUUID()
 const grant=(condition:string,values:unknown[])=>db.prepare(`UPDATE sessions SET mfa_verified_until=MIN(expires_at,?),mfa_factor_version=? WHERE token_hash=? AND user_id=? AND ${condition}`).bind(now+3600,factor.version,sessionHash,user.id,...values)
 if(data.action==='confirm'){
  if(factor.enabledAt||!factor.pendingUntil||factor.pendingUntil<=now)throw new HttpError(400,'La configuración venció o ya fue confirmada')
  await confirmAdmin(db,user,data.currentPassword,master)
  const step=await validStep(await unseal(factor.sealed,user.id,key),data.code,factor.lastStep)
  if(step===null)throw new HttpError(403,'Código incorrecto o ya utilizado')
  const codes=Array.from({length:8},()=>randomToken().slice(0,32)),hashes=await Promise.all(codes.map(digest))
  const condition='EXISTS(SELECT 1 FROM admin_mfa WHERE user_id=? AND version=? AND last_challenge=?)',values=[user.id,factor.version,challenge]
  const rows=await db.batch([db.prepare('UPDATE admin_mfa SET enabled_at=CURRENT_TIMESTAMP,pending_until=NULL,last_step=?,last_challenge=? WHERE user_id=? AND version=? AND enabled_at IS NULL AND pending_until>unixepoch() AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)').bind(step,challenge,user.id,factor.version,user.id,master.hash),...hashes.map(hash=>db.prepare(`INSERT INTO admin_mfa_recovery(user_id,code_hash) SELECT ?,? WHERE ${condition}`).bind(user.id,hash,...values)),grant(condition,values),db.prepare(`INSERT INTO platform_audit(id,actor_id,action,target_type,target_id,detail) SELECT ?,?,'mfa.enabled','account',?,'{}' WHERE ${condition}`).bind(challenge,user.id,user.id,...values)])
  if(!rows[0].meta.changes)throw new HttpError(409,'La configuración cambió. Vuelve a intentarlo')
  return Response.json({verified:true,recoveryCodes:codes})
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
 const rows=await db.batch([consume,grant(condition,values)])
 if(!rows[0].meta.changes||!rows[1].meta.changes)throw new HttpError(403,'Código incorrecto o ya utilizado')
 await db.prepare('DELETE FROM auth_limits WHERE key=?').bind(await digest(`admin-mfa:${user.id}`)).run()
 return Response.json({verified:true})
}
