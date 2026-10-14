export interface Subscription {permanent?:boolean;serverNow:number;status:'trial'|'active'|'expired'|'suspended'|'permanent';canWrite:boolean;trialExpiresAt:number|null;paidUntil:number|null;expiresAt:number;daysRemaining:number;planName:string}
export function subscriptionState(trialExpiresAt:number|null,paidUntil:number|null,now=Math.floor(Date.now()/1000)){
 const expiresAt=paidUntil??trialExpiresAt??0,canWrite=expiresAt>now
 return {serverNow:now,status:(!canWrite?'expired':paidUntil!==null?'active':'trial') as Subscription['status'],canWrite,trialExpiresAt,paidUntil,expiresAt,daysRemaining:Math.max(0,Math.ceil((expiresAt-now)/86400))}
}
export function subscriptionDate(seconds:number|null){return seconds===null?'—':new Date(seconds*1000).toLocaleString('es-GT',{timeZone:'America/Guatemala',dateStyle:'medium',timeStyle:'short'})}
