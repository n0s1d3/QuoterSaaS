import { quotaLevel,type PlanUsage } from '../lib/plans'
export default function PlanNotice({data,navigate}:{data:PlanUsage|null;navigate:(path:string)=>void}){
 if(!data)return null
 const warnings=[['cotizaciones',data.usage.quotes,data.plan.quoteLimit],['catálogo',data.usage.catalog,data.plan.catalogLimit],['equipo',data.usage.seats,data.plan.memberLimit]].filter(([,used,limit])=>quotaLevel(Number(used),Number(limit))!=='normal')
 if(!warnings.length)return null
 return <div className="plan-notice" role="status"><span>{data.plan.name}: {warnings.map(([label,used,limit])=>`${label} ${used}/${limit}`).join(' · ')}</span><a href="/plan" onClick={e=>{e.preventDefault();navigate('/plan')}}>Ver plan y uso</a></div>
}
