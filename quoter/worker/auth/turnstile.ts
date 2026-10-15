import { HttpError } from '../http.ts'
import { localPreview,type EmailEnvironment } from './environment.ts'
export interface AbuseEnvironment extends EmailEnvironment {TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET_KEY?:string;SIGNUP_DAILY_LIMIT?:string}
export function challengeOptions(request:Request,env:AbuseEnvironment){return {required:!localPreview(request,env),siteKey:localPreview(request,env)?null:env.TURNSTILE_SITE_KEY||null}}
export async function challenge(request:Request,env:AbuseEnvironment,token:unknown,action:'quoter_register'|'quoter_recovery'){
 if(localPreview(request,env))return
 if(!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY)throw new HttpError(503,'El registro y la recuperación no están disponibles en este momento. Intenta más tarde.')
 if(typeof token!=='string'||!token||token.length>2048)throw new HttpError(400,'Completa la verificación de seguridad')
 const data=new FormData();data.set('secret',env.TURNSTILE_SECRET_KEY);data.set('response',token);data.set('idempotency_key',crypto.randomUUID());const ip=request.headers.get('CF-Connecting-IP');if(ip)data.set('remoteip',ip)
 let result:{success?:boolean;hostname?:string;action?:string}
 let stage:'request'|'http'|'json'='request',status:number|undefined
 try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:data,redirect:'manual',signal:AbortSignal.timeout(5000)});status=response.status;stage='http';if(!response.ok)throw new Error();stage='json';result=await response.json()}catch(error){console.error('Turnstile verification unavailable',{stage,...(status===undefined?{}:{status}),errorType:error instanceof Error&&['Error','TypeError','SyntaxError','TimeoutError','AbortError'].includes(error.name)?error.name:'Error'});throw new HttpError(503,'La verificación de seguridad no está disponible. Intenta nuevamente')}
 if(result.success!==true||result.hostname!==new URL(request.url).hostname||result.action!==action)throw new HttpError(403,'La verificación de seguridad venció o no es válida. Intenta nuevamente')
}
export function signupDailyLimit(env:AbuseEnvironment){if(env.SIGNUP_DAILY_LIMIT===undefined)return 250;const value=Number(env.SIGNUP_DAILY_LIMIT);if(!/^\d+$/.test(env.SIGNUP_DAILY_LIMIT)||!Number.isSafeInteger(value)||value<1||value>10000)throw new HttpError(503,'Configuración de registro no disponible');return value}
