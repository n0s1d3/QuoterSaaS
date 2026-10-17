import { useEffect,useState,type ReactNode } from 'react'
import PlanNotice from './PlanNotice'
import type { PlanUsage } from '../lib/plans'
import { api } from '../lib/api'
import { SubscriptionContext } from '../lib/subscription-context'
import { subscriptionDate,type Subscription } from '../lib/subscription'
export default function SubscriptionProvider({path,owner,navigate,children}:{path:string;owner:boolean;navigate:(path:string)=>void;children:ReactNode}){
 const administrative=path==='/admin'
 const [usage,setUsage]=useState<PlanUsage|null>(null)
 const [data,setData]=useState<Subscription|null>(null),[error,setError]=useState(''),[clock,setClock]=useState(0)
 useEffect(()=>{if(administrative)return;let active=true,version=0;const refresh=()=>{const current=++version;(owner?api<PlanUsage>('/plans').then(result=>{if(active&&current===version)setUsage(result);return result.subscription}):api<Subscription>('/subscription')).then(result=>{if(active&&current===version){setData(result);setError('');setClock(result.serverNow*1000)}}).catch(e=>{if(active&&current===version)setError(e.message)})};refresh();const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('quoter-subscription-changed',refresh);window.addEventListener('quoter-usage-changed',refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('quoter-subscription-changed',refresh);window.removeEventListener('quoter-usage-changed',refresh)}},[administrative,owner])
 useEffect(()=>{if(administrative||!data?.canWrite||data.permanent)return;const delay=Math.min(2147483647,Math.max(0,(data.expiresAt-data.serverNow)*1000));const timer=setTimeout(()=>{setClock(Math.min(data.expiresAt*1000,data.serverNow*1000+delay));window.dispatchEvent(new Event('quoter-subscription-changed'))},delay);return()=>clearTimeout(timer)},[data,administrative])
 const canWrite=!error&&!!data?.canWrite&&(!!data.permanent||data.expiresAt*1000>clock)
 const suspended=data?.status==='suspended'
 const expired=data&&!data.permanent&&data.expiresAt*1000<=clock,show=suspended||expired||data?.status==='trial'||data&&!data.permanent&&data.daysRemaining<=7
 if(path==='/admin')return <>{children}</>
 return <SubscriptionContext.Provider value={{canWrite,subscription:data}}>{owner&&<PlanNotice data={usage} navigate={navigate}/>}{error&&<p className="error" role="alert">No se pudo comprobar la vigencia: {error}. Los cambios permanecerán deshabilitados hasta verificarla.</p>}{show&&<div className={`plan-notice subscription-notice ${expired||suspended?'subscription-expired':''}`} role="status"><span>{suspended?'Negocio suspendido · Solo lectura':expired?'Vigencia vencida · Solo lectura':data?.status==='trial'?`Prueba de 7 días · ${data.daysRemaining} días restantes`:`Tu plan vence en ${data?.daysRemaining} días`} · {subscriptionDate(data?.expiresAt??null)}{(expired||suspended)&&' · Puedes consultar, descargar PDF y exportar respaldos.'}</span>{owner?<a href="/plan" onClick={e=>{e.preventDefault();navigate('/plan')}}>Ver vigencia y renovación</a>:<span>Contacta al propietario para renovar.</span>}</div>}{children}</SubscriptionContext.Provider>
}
