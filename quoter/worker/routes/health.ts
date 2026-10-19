import type { EmailEnvironment } from '../auth/environment.ts'
import { localPreview } from '../auth/environment.ts'
import { mailReady } from '../auth/mail.ts'
import { signupDailyLimit } from '../auth/turnstile.ts'
/** Public readiness returns no tenant data, secret values or detailed configuration. */
export async function health(request:Request,db:D1Database|undefined,env:EmailEnvironment & {MFA_ENCRYPTION_KEY?:string}){
 if(request.method!=='GET')return Response.json({status:'unavailable'},{status:405})
 try{
  if(!db||!/^[a-f0-9]{64}$/i.test(env.PASSWORD_PEPPER||''))throw new Error('configuration')
  if(!localPreview(request,env)){
   if(!/^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY||'')||!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY)throw new Error('configuration')
   mailReady(request,env);if(new URL(env.APP_URL!).origin!==new URL(request.url).origin)throw new Error('configuration')
  }
  signupDailyLimit(env)
  const state=await db.prepare("SELECT EXISTS(SELECT 1 FROM d1_migrations WHERE name='0022_billing_periods.sql') AS migrated,(SELECT COUNT(*) FROM sqlite_schema WHERE type='trigger' AND name IN('request_authorization','admin_mfa_write_guard','admin_mfa_reset','reject_early_paid_downgrade')) AS guards").first<{migrated:number;guards:number}>()
  if(!state?.migrated||state.guards!==4)throw new Error('schema')
  return Response.json({status:'ok'})
 }catch{return Response.json({status:'unavailable'},{status:503})}
}
