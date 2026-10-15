import { challenge,challengeOptions,signupDailyLimit } from '../auth/turnstile'
import { newPasswordHash,verifyPassword,needsPasswordUpgrade } from '../auth/passwords'
import { limit } from '../auth/rate-limit'
import { issueToken } from '../auth/email-tokens'
import { sendAccountEmail } from '../auth/mail'
import type { EmailEnvironment } from '../auth/environment'
import { emailRoutes } from './account-email'
import { body,HttpError,text } from '../http'
import { account,cookieToken,digest,newSession,randomToken,sessionCookie } from '../auth/session'
export async function auth(request:Request,db:D1Database,path:string,env:EmailEnvironment,context:ExecutionContext) {
 if(path==='/api/auth/security-options'&&request.method==='GET')return Response.json(challengeOptions(request,env))
 if(['/api/auth/email-options','/api/auth/forgot-password','/api/auth/reset-password','/api/auth/verify-email','/api/auth/resend-verification'].includes(path))return emailRoutes(request,db,path,env,context)
 if(path==='/api/auth/me'&&request.method==='GET')return Response.json(await account(request,db))
 if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
 if(path==='/api/auth/logout') {
  const token=cookieToken(request);if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run()
  return Response.json({loggedOut:true},{headers:{'Set-Cookie':sessionCookie(request,'',0)}})
 }
 if(!['/api/auth/login','/api/auth/register'].includes(path))throw new HttpError(404,'Route not found')
 const data=await body(request)
 if(path.endsWith('register')&&(typeof data.confirmPassword!=='string'||data.confirmPassword!==data.password))throw new HttpError(400,'Las contraseñas no coinciden.')
 const email=text(data.email,'Correo',true,254)!.toLowerCase()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Correo inválido')
 if(typeof data.password!=='string'||data.password.length>128||data.password.length<1)throw new HttpError(400,'Contraseña inválida')
 await limit(db,`${path}:${request.headers.get('CF-Connecting-IP')||'local'}`,path.endsWith('register')?20:100)
 await limit(db,`${path}:${email}`,10)
 let userId:string
 let expectedHash:string|undefined
 let delivery:Record<string,string|undefined> = {}
 if(path.endsWith('register')) {
  await challenge(request,env,data.turnstileToken,'quoter_register')
  if(data.password.length<12)throw new HttpError(400,'La contraseña debe tener al menos 12 caracteres')
  const name=text(data.businessName,'Nombre del negocio',true,200)
  const existing=await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
  if(existing)throw new HttpError(409,'Este correo ya tiene una cuenta')
  await limit(db,`signup:day:${Math.floor(Date.now()/86400000)}`,signupDailyLimit(env),86400-Math.floor(Date.now()/1000)%86400,'Se alcanzó el límite diario de registros. Intenta más tarde.')
  userId=crypto.randomUUID();const orgId=crypto.randomUUID(),salt=randomToken(),hash=await newPasswordHash(data.password,salt,env)
  try {await db.batch([
   db.prepare('INSERT INTO organizations (id,name,slug) VALUES (?,?,?)').bind(orgId,name,orgId),
   db.prepare('INSERT INTO users (id,organization_id,email,password_hash,password_salt) VALUES (?,?,?,?,?)').bind(userId,orgId,email,hash,salt),
   db.prepare('INSERT INTO memberships (user_id,organization_id,role) VALUES (?,?,?)').bind(userId,orgId,'owner'),
  ])}catch(error){if(await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first())throw new HttpError(409,'Este correo ya tiene una cuenta');throw error}
 }else{
  const user=await db.prepare('SELECT id,password_hash AS hash,password_salt AS salt,suspended_at AS suspendedAt FROM users WHERE email=?').bind(email).first<{id:string;hash:string;salt:string;suspendedAt:string|null}>()
  const valid=await verifyPassword(data.password,user?.salt||'0'.repeat(64),user?.hash||'pbkdf2-sha256-peppered$100000$v1$'+'0'.repeat(64),env)
  if(!user||!valid)throw new HttpError(401,'Correo o contraseña incorrectos')
  if(user.suspendedAt)throw new HttpError(403,'Tu cuenta fue desactivada. Contacta a la administración para recuperar el acceso.')
  userId=user.id; expectedHash=user.hash
  if(needsPasswordUpgrade(user.hash)){
   const salt=randomToken(),upgraded=await newPasswordHash(data.password,salt,env)
   const result=await db.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=? AND password_hash=? AND password_salt=? AND suspended_at IS NULL').bind(upgraded,salt,user.id,user.hash,user.salt).run()
   if(!result.meta.changes)throw new HttpError(401,'La cuenta cambió. Vuelve a iniciar sesión')
   expectedHash=upgraded
  }
 }
 if(path.endsWith('register')) {
  try {delivery=await sendAccountEmail(request,env,email,'verify',await issueToken(db,userId,'verify'))}
  catch {delivery={emailDelivery:'unavailable',notice:'Cuenta creada. No se pudo enviar la verificación; vuelve a solicitarla cuando el correo esté configurado.'}}
 }
 const cookie=await newSession(request,db,userId,expectedHash)
 const user=await db.prepare('SELECT u.id,u.email,(u.email_verified_at IS NOT NULL) AS emailVerified,EXISTS(SELECT 1 FROM platform_admin p WHERE p.email=u.email AND u.email_verified_at IS NOT NULL) AS isPlatformAdmin,u.organization_id AS organizationId,o.name AS organizationName FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=?').bind(userId).first<Record<string,unknown>>()
 return Response.json({...user,role:'owner',emailVerified:!!user?.emailVerified,isPlatformAdmin:!!user?.isPlatformAdmin,...delivery},{status:path.endsWith('register')?201:200,headers:{'Set-Cookie':cookie}})
}
