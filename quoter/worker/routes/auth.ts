import { body,HttpError,text } from '../http'
import { account,cookieToken,digest,equalHashes,newSession,passwordHash,randomToken,sessionCookie } from '../auth/session'
async function limit(db:D1Database,key:string,max:number) {
 const now=Math.floor(Date.now()/1000)
 await db.prepare('DELETE FROM auth_limits WHERE expires_at<=?').bind(now).run()
 const result=await db.prepare('INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(await digest(key),now+900,now,now).first<{attempts:number}>()
 if(result&&result.attempts>max)throw new HttpError(429,'Demasiados intentos. Espera 15 minutos e intenta nuevamente')
}
export async function auth(request:Request,db:D1Database,path:string) {
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
  userId=user.id
 }
 const cookie=await newSession(request,db,userId)
 const user=await db.prepare('SELECT u.id,u.email,u.organization_id AS organizationId,o.name AS organizationName FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=?').bind(userId).first()
 return Response.json(user,{status:path.endsWith('register')?201:200,headers:{'Set-Cookie':cookie}})
}
