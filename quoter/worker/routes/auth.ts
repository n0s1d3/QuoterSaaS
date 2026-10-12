import { limit } from '../auth/rate-limit'
import { issueToken } from '../auth/email-tokens'
import { sendAccountEmail } from '../auth/mail'
import type { EmailEnvironment } from '../auth/environment'
import { emailRoutes } from './account-email'
import { body,HttpError,text } from '../http'
import { account,cookieToken,digest,equalHashes,newSession,passwordHash,randomToken,sessionCookie } from '../auth/session'
export async function auth(request:Request,db:D1Database,path:string,env:EmailEnvironment,context:ExecutionContext) {
 if(['/api/auth/email-options','/api/auth/forgot-password','/api/auth/reset-password','/api/auth/verify-email','/api/auth/resend-verification'].includes(path))return emailRoutes(request,db,path,env,context)
 if(path==='/api/auth/me'&&request.method==='GET')return Response.json(await account(request,db))
 if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
 if(path==='/api/auth/logout') {
  const token=cookieToken(request);if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run()
  return Response.json({loggedOut:true},{headers:{'Set-Cookie':sessionCookie(request,'',0)}})
 }
 if(!['/api/auth/login','/api/auth/register'].includes(path))throw new HttpError(404,'Route not found')
 const data=await body(request)
 const email=text(data.email,'Correo',true,254)!.toLowerCase()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Correo inválido')
 if(typeof data.password!=='string'||data.password.length>128||data.password.length<1)throw new HttpError(400,'Contraseña inválida')
 await limit(db,`${path}:${request.headers.get('CF-Connecting-IP')||'local'}`,path.endsWith('register')?20:100)
 await limit(db,`${path}:${email}`,10)
 let userId:string
 let expectedHash:string|undefined
 let delivery:Record<string,string|undefined> = {}
 if(path.endsWith('register')) {
  if(data.password.length<12)throw new HttpError(400,'La contraseña debe tener al menos 12 caracteres')
  const name=text(data.businessName,'Nombre del negocio',true,200)
  const existing=await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
  if(existing)throw new HttpError(409,'Este correo ya tiene una cuenta')
  userId=crypto.randomUUID();const orgId=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(data.password,salt)
  try {await db.batch([
   db.prepare('INSERT INTO organizations (id,name,slug) VALUES (?,?,?)').bind(orgId,name,orgId),
   db.prepare('INSERT INTO users (id,organization_id,email,password_hash,password_salt) VALUES (?,?,?,?,?)').bind(userId,orgId,email,hash,salt),
  ])}catch(error){if(await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first())throw new HttpError(409,'Este correo ya tiene una cuenta');throw error}
 }else{
  const user=await db.prepare('SELECT id,password_hash AS hash,password_salt AS salt FROM users WHERE email=?').bind(email).first<{id:string;hash:string;salt:string}>()
  const calculated=await passwordHash(data.password,user?.salt||'0000000000000000000000000000000000000000000000000000000000000000')
  if(!user||!equalHashes(calculated,user.hash))throw new HttpError(401,'Correo o contraseña incorrectos')
  userId=user.id; expectedHash=user.hash
 }
 if(path.endsWith('register')) {
  try {delivery=await sendAccountEmail(request,env,email,'verify',await issueToken(db,userId,'verify'))}
  catch {delivery={emailDelivery:'unavailable',notice:'Cuenta creada. No se pudo enviar la verificación; vuelve a solicitarla cuando el correo esté configurado.'}}
 }
 const cookie=await newSession(request,db,userId,expectedHash)
 const user=await db.prepare('SELECT u.id,u.email,(u.email_verified_at IS NOT NULL) AS emailVerified,u.organization_id AS organizationId,o.name AS organizationName FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=?').bind(userId).first<Record<string,unknown>>()
 return Response.json({...user,emailVerified:!!user?.emailVerified,...delivery},{status:path.endsWith('register')?201:200,headers:{'Set-Cookie':cookie}})
}
