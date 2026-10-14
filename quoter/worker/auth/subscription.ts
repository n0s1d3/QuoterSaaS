import { subscriptionState } from '../../src/lib/subscription.ts'
import { HttpError } from '../http.ts'
export const expiredMessage='La prueba o el plan de este negocio venció. Puedes consultar tus datos, descargar PDF y exportar respaldos. El propietario debe renovar para volver a realizar cambios.'
export const suspendedMessage='Este negocio está suspendido por la administración. Puedes consultar tus datos, descargar PDF y exportar respaldos.'
export async function businessSubscription(db:D1Database,org:string){
 const row=await db.prepare('SELECT o.trial_expires_at AS trialExpiresAt,o.paid_until AS paidUntil,o.suspended_at AS suspendedAt,EXISTS(SELECT 1 FROM platform_permanent_businesses WHERE id=o.id) AS permanent,p.name AS planName FROM organizations o JOIN subscription_plans p ON p.id=o.plan_id WHERE o.id=?').bind(org).first<{trialExpiresAt:number|null;paidUntil:number|null;planName:string;suspendedAt:string|null;permanent:number}>()
 if(!row)throw new HttpError(404,'Negocio no encontrado')
 return {...subscriptionState(row.trialExpiresAt,row.paidUntil),permanent:!!row.permanent,...(row.permanent?{status:'permanent' as const,canWrite:true}:{}),...(row.suspendedAt?{status:'suspended' as const,canWrite:false}:{}),planName:row.planName}
}
export async function requireSubscription(db:D1Database,org:string){const subscription=await businessSubscription(db,org);if(!subscription.canWrite)throw new HttpError(403,subscription.status==='suspended'?suspendedMessage:expiredMessage)}
