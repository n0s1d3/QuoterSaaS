import { useEffect,useState } from 'react'
import { api } from '../lib/api'
import { auditLabels,auditTime,type AuditEvent } from '../lib/audit'
import { statuses } from '../lib/statuses'
export default function QuoteHistory({id}:{id:string}){
 const [events,setEvents]=useState<AuditEvent[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0)
 useEffect(()=>{let active=true;api<AuditEvent[]>(`/quotes/${id}/history`).then(rows=>{if(active){setEvents(rows);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[id,revision])
 return <details className="panel"><summary>Historial de la cotización</summary><button className="secondary history-refresh" onClick={()=>setRevision(n=>n+1)}>Actualizar historial</button>{error&&<p className="error" role="alert">{error}</p>}<ol className="audit-list">{events.map(event=>{const detail=JSON.parse(event.detail);return <li key={event.id}><strong>{auditLabels[event.action]||event.action}{detail.status&&` · ${statuses[detail.status]||detail.status}`}</strong><small>{event.actorEmail} · {auditTime(event.createdAt)}</small></li>})}</ol>{!events.length&&!error&&<p className="hint">Los cambios anteriores a esta actualización no tienen historial registrado.</p>}</details>
}
