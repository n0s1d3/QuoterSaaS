import type { Subscription } from './subscription'
export interface BusinessPlan {id:string;name:string;quoteLimit:number;catalogLimit:number;memberLimit:number}
export interface PlanUsage {subscription:Subscription;activations:{planName:string;createdAt:string;periodStart:number|null;periodEnd:number|null;reference:string}[];businessId:string;plan:BusinessPlan;plans:BusinessPlan[];usage:{quotes:number;catalog:number;members:number;pendingInvitations:number;seats:number};preview:boolean}
export function quotaLevel(used:number,limit:number){return used>=limit?'full':used>=Math.ceil(limit*.8)?'warning':'normal'}
