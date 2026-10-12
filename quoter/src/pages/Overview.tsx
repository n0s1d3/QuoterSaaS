import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { QuoteSummary } from '../lib/types'
import { formatMoney } from '../lib/money'
import { statuses } from '../lib/statuses'
export default function Overview({ dashboard, navigate }: { dashboard: boolean; navigate: (path: string) => void }) {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  useEffect(() => { api<QuoteSummary[]>('/quotes').then(setQuotes).catch(e => setError(e.message)) }, [])
  async function change(q: QuoteSummary, status: string) {
    setBusy(q.id); setError('')
    try { await api(`/quotes/${q.id}`,{status},'PATCH'); setQuotes(rows => rows!.map(row => row.id === q.id ? {...row,status} : row)) } catch(e) {setError((e as Error).message)} finally {setBusy(null)}
  }
  async function remove(q: QuoteSummary) {
    if (!window.confirm(`¿Eliminar ${q.quoteNumber}? Esta acción no se puede deshacer.`)) return
    setBusy(q.id);setError('')
    try {await api(`/quotes/${q.id}`,{},'DELETE');setQuotes(rows => rows!.filter(row => row.id !== q.id))} catch(e) {setError((e as Error).message)} finally {setBusy(null)}
  }
  const visible = (quotes || []).filter(q => filter === 'all' || q.status === filter)
  return <><div className="page-heading"><div><p className="eyebrow">TU NEGOCIO</p><h1>{dashboard ? 'Resumen' : 'Cotizaciones'}</h1><p>{dashboard ? 'Tu actividad de un vistazo.' : 'Revisa tus propuestas y actualiza su estado.'}</p></div><button onClick={() => navigate('/quotes/new')}>+ Nueva cotización</button></div>{error && <p className="error" role="alert">{error}</p>}{!quotes && !error && <p>Cargando cotizaciones…</p>}{quotes && <>{dashboard && <div className="stats">{[['Cotizaciones',quotes.length],['Borradores',quotes.filter(q => q.status === 'draft').length],['Aceptadas',quotes.filter(q => q.status === 'accepted').length],['Valor cotizado',formatMoney(quotes.reduce((n,q) => n+q.total,0))]].map(([label,value]) => <section className="panel" key={label}><p>{label}</p><strong>{value}</strong></section>)}</div>}<label className="status-filter">Filtrar por estado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="quote-grid">{(dashboard ? visible.slice(0,6) : visible).map(q => <article className="panel quote-card" key={q.id}><div className="section-heading"><a href={`/quotes/${q.id}`} onClick={e => {e.preventDefault();navigate(`/quotes/${q.id}`)}}>{q.quoteNumber}</a><span className={`badge ${q.status}`}>{statuses[q.status] || q.status}</span></div><h2>{q.customerName}</h2><div className="quote-preview"><p>{q.preview || 'Sin descripción'}</p><small>{q.itemCount || 0} partidas · {q.issueDate}</small></div><div className="card-total"><span>Total</span><strong>{formatMoney(q.total)}</strong></div><button className="secondary" onClick={() => navigate(`/quotes/${q.id}`)}>Ver cotización</button><label className="status-control">Estado<select aria-label={`Estado ${q.quoteNumber}`} disabled={busy !== null} value={q.status} onChange={e => {void change(q,e.target.value)}}>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="subtle" disabled={busy !== null} onClick={() => {void remove(q)}}>Eliminar cotización</button></article>)}</div>{!visible.length && <div className="empty"><h2>No hay cotizaciones</h2><button onClick={() => navigate('/quotes/new')}>Crear cotización</button></div>}</>}</>
}
