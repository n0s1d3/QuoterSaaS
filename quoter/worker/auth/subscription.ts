import { subscriptionState } from '../../src/lib/subscription.ts'
import { HttpError } from '../http.ts'
export const expiredMessage='La prueba o el plan de este negocio venció. Puedes consultar tus datos, descargar PDF y exportar respaldos. El propietario debe renovar para volver a realizar cambios.'
export async function businessSubscription(db:D1Database,org:string){
 const row=await db.prepare('SELECT o.trial_expires_at AS trialExpiresAt,o.paid_until AS paidUntil,p.name AS planName FROM organizations o JOIN subscription_plans p ON p.id=o.plan_id WHERE o.id=?').bind(org).first<{trialExpiresAt:number|null;paidUntil:number|null;planName:string}>()
 if(!row)throw new HttpError(404,'Negocio no encontrado')
 return {...subscriptionState(row.trialExpiresAt,row.paidUntil),planName:row.planName}
}
export async function requireSubscription(db:D1Database,org:string){if(!(await businessSubscription(db,org)).canWrite)throw new HttpError(403,expiredMessage)}
