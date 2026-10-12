import { HttpError } from '../http.ts'
import { localPreview } from './environment.ts'
import type { EmailEnvironment } from './environment.ts'
export function mailReady(request:Request,env:EmailEnvironment) {
 if(localPreview(request,env))return
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.APP_URL)throw new HttpError(503,'El envío de correo todavía no está configurado')
 let url:URL
 try{url=new URL(env.APP_URL)}catch{throw new HttpError(503,'APP_URL no es válida')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new HttpError(503,'APP_URL debe ser el origen HTTPS de la aplicación')
}
export async function sendAccountEmail(request:Request,env:EmailEnvironment,email:string,purpose:'verify'|'reset',token:string) {
 mailReady(request,env)
 const origin=localPreview(request,env)?new URL(request.url).origin:new URL(env.APP_URL!).origin
 const url=`${origin}/account/${purpose}#token=${token}`
 if(localPreview(request,env))return {emailDelivery:'preview',previewUrl:url}
 const subject=purpose==='verify'?'Verifica tu correo en Quoter':'Restablece tu contraseña en Quoter'
 const text=purpose==='verify'?`Confirma tu correo abriendo este enlace y pulsando Verificar correo:\n${url}\n\nVence en 24 horas. Si no creaste esta cuenta, ignora el mensaje.`:`Abre este enlace para elegir una nueva contraseña:\n${url}\n\nVence en 30 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este mensaje.`
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[email],subject,text}),signal:AbortSignal.timeout(10000)})
 if(!response.ok){console.error('Account email delivery rejected',{purpose,status:response.status});throw new HttpError(503,'No se pudo enviar el correo. Intenta nuevamente más tarde')}
 return {emailDelivery:'sent'}
}
