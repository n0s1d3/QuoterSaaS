import { HttpError } from '../http.ts'
import { digest } from './session.ts'
import { localPreview,type EmailEnvironment } from './environment.ts'
import { challenge } from './turnstile.ts'
/** Indexed, bounded reclamation; an expired counter also resets atomically below. */
export async function attempts(db:D1Database,key:string,windowSeconds=900) {
 const now=Math.floor(Date.now()/1000)
 await db.prepare('DELETE FROM auth_limits WHERE key IN (SELECT key FROM auth_limits WHERE expires_at<=? ORDER BY expires_at LIMIT 100)').bind(now).run()
 const result=await db.prepare('INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(await digest(key),now+windowSeconds,now,now).first<{attempts:number}>()
 return result?.attempts||0
}
export async function limit(db:D1Database,key:string,max:number,windowSeconds=900,message='Demasiados intentos. Espera 15 minutos e intenta nuevamente') {
 if(await attempts(db,key,windowSeconds)>max)throw new HttpError(429,message,windowSeconds)
}
/** Other IPs can require a proof of humanity, but cannot lock an account by email alone. */
export async function loginLimit(db:D1Database,request:Request,email:string,token:unknown,env:EmailEnvironment) {
 const ip=request.headers.get('CF-Connecting-IP')||'local'
 await limit(db,`/api/auth/login:${ip}`,100)
 await limit(db,`login:ip-email:${ip}:${email}`,10)
 const global=await attempts(db,`login:email:${email}`)
 if(global>10&&!localPreview(request,env)){
  if(!token)return Response.json({error:'Completa la verificación de seguridad para iniciar sesión',code:'LOGIN_CHALLENGE_REQUIRED',challengeRequired:true},{status:403})
  await challenge(request,env,token,'quoter_login')
 }
 return null
}
