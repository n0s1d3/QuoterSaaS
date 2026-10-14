import { useEffect,useState } from 'react'
import { api } from '../lib/api'
import { quotaLevel,type PlanUsage } from '../lib/plans'
export default function PlanNotice({path,navigate}:{path:string;navigate:(path:string)=>void}){
 const [data,setData]=useState<PlanUsage|null>(null)
 useEffect(()=>{let active=true,version=0;const refresh=()=>{const current=++version;api<PlanUsage>('/plans').then(result=>{if(active&&current===version)setData(result)}).catch(()=>{})};refresh();window.addEventListener('quoter-usage-changed',refresh);return()=>{active=false;window.removeEventListener('quoter-usage-changed',refresh)}},[path])
 if(!data)return null
 const warnings=[['cotizaciones',data.usage.quotes,data.plan.quoteLimit],['catálogo',data.usage.catalog,data.plan.catalogLimit],['equipo',data.usage.seats,data.plan.memberLimit]].filter(([,used,limit])=>quotaLevel(Number(used),Number(limit))!=='normal')
 if(!warnings.length)return null
 return <div className="plan-notice" role="status"><span>Plan {data.plan.name}: {warnings.map(([label,used,limit])=>`${label} ${used}/${limit}`).join(' · ')}</span><a href="/plan" onClick={e=>{e.preventDefault();navigate('/plan')}}>Ver plan y uso</a></div>
}
