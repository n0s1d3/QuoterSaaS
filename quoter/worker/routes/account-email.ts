import { body,HttpError,text } from '../http'
import { account,sessionCookie } from '../auth/session'
import { consumeToken,issueToken } from '../auth/email-tokens'
import { mailReady,sendAccountEmail } from '../auth/mail'
import { localPreview } from '../auth/environment'
import type { EmailEnvironment } from '../auth/environment'
import { limit } from '../auth/rate-limit'
export async function emailRoutes(request:Request,db:D1Database,path:string,env:EmailEnvironment,context:ExecutionContext) {
 if(path==='/api/auth/email-options'&&request.method==='GET')return Response.json({preview:localPreview(request,env)})
 if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
 await limit(db,`email:${path}:${request.headers.get('CF-Connecting-IP')||'local'}`,50)
 const data=await body(request)
 if(path==='/api/auth/reset-password'||path==='/api/auth/verify-email') {
  await consumeToken(db,data.token,path.endsWith('reset-password')?'reset':'verify',data.password)
  return Response.json({message:path.endsWith('reset-password')?'Contraseña actualizada. Inicia sesión con tu nueva contraseña.':'Correo verificado. Inicia sesión para continuar.'},{headers:{'Set-Cookie':sessionCookie(request,'',0)}})
 }
 if(path==='/api/auth/resend-verification') {
  const user=await account(request,db)
  if(user.emailVerified)return Response.json({message:'Tu correo ya está verificado.'})
  await limit(db,`verify:${user.id}`,5)
  mailReady(request,env)
  return Response.json({message:'Verificación solicitada.',...await sendAccountEmail(request,env,user.email,'verify',await issueToken(db,user.id,'verify'))})
 }
 if(path==='/api/auth/forgot-password') {
  const email=text(data.email,'Correo',true,254)!.toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Correo inválido')
  await limit(db,`reset:${email}`,5)
  mailReady(request,env)
  const user=await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first<{id:string}>()
  const send = async () => {
    if (!user) return {}
    try { return await sendAccountEmail(request,env,email,'reset',await issueToken(db,user.id,'reset')) }
    catch { console.error('Password reset email unavailable'); return {} }
  }
  // In production, keep provider latency/errors out of the account-existence response.
  let delivery:Record<string,string|undefined>={}
  if(localPreview(request,env))delivery=await send()
  else context.waitUntil(send())
  return Response.json({message:'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.',...delivery})
 }
 throw new HttpError(404,'Route not found')
}
