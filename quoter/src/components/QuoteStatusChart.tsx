import { statuses } from '../lib/statuses'
const colors: Record<string,string> = { draft: '#6f718b', sent: '#ffba08', accepted: '#e85d04', rejected: '#d00000' }
export default function QuoteStatusChart({ counts: values, navigate }: { counts: Record<string,number>; navigate:(path:string)=>void }) {
  const counts = Object.keys(statuses).map(status => ({ status, count: values[status] || 0 }))
  const total = counts.reduce((sum,item)=>sum+item.count,0)
  let position = 0
  const stops = counts.filter(item => item.count).map(item => {
    const start = position
    position += item.count / Math.max(total, 1) * 100
    return `${colors[item.status]} ${start}% ${position}%`
  })
  return <section className="panel"><h2>Estado de las cotizaciones</h2><p className="dashboard-hint">Tu actividad comercial de un vistazo.</p><div className="status-overview"><div className="status-ring" style={{background: stops.length ? `conic-gradient(${stops.join(',')})` : '#292b3c'}} role="img" aria-label={counts.map(item => `${statuses[item.status]}: ${item.count}`).join(', ')}><div><strong>{total}</strong><small>Cotizaciones</small></div></div><div className="status-legend">{counts.map(item => <a href={`/quotes?status=${item.status}`} key={item.status} onClick={e => {e.preventDefault();navigate(`/quotes?status=${item.status}`)}}><i style={{background:colors[item.status]}}/>{statuses[item.status]}<strong>{item.count}</strong></a>)}</div></div></section>
}
