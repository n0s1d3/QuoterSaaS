import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { QuoteSummary } from '../lib/types'
import { formatMoney } from '../lib/money'
export function QuoteTable({ quotes, navigate }: { quotes: QuoteSummary[]; navigate: (path: string) => void }) {
  if (!quotes.length) return <div className="empty"><h3>No quotes yet</h3><p>Create your first quote to get started.</p><button onClick={() => navigate('/quotes/new')}>New quote</button></div>
  return <div className="table-wrap"><table><thead><tr><th>Quote #</th><th>Customer</th><th>Status</th><th>Date</th><th className="amount">Total</th></tr></thead><tbody>{quotes.map(q => <tr key={q.id} onClick={() => navigate(`/quotes/${q.id}`)} className="clickable"><td><a href={`/quotes/${q.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/quotes/${q.id}`) }}>{q.quoteNumber}</a></td><td>{q.customerName}</td><td><span className="badge">{q.status}</span></td><td>{q.issueDate}</td><td className="amount">{formatMoney(q.total)}</td></tr>)}</tbody></table></div>
}
export default function Overview({ dashboard, navigate }: { dashboard: boolean; navigate: (path: string) => void }) {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<QuoteSummary[]>('/quotes').then(setQuotes).catch(e => setError(e.message)) }, [])
  return <><div className="page-heading"><div><p className="eyebrow">DEMO BUSINESS</p><h1>{dashboard ? 'Dashboard' : 'Quotes'}</h1><p>{dashboard ? 'A snapshot of your quoting activity.' : 'All your estimates, in one place.'}</p></div><button onClick={() => navigate('/quotes/new')}>+ New quote</button></div>{error && <p className="error" role="alert">{error}</p>}{!quotes && !error && <p>Loading quotes…</p>}{quotes && <>{dashboard && <div className="stats">{[['Total Quotes', quotes.length], ['Draft Quotes', quotes.filter(q => q.status === 'draft').length], ['Accepted Quotes', quotes.filter(q => q.status === 'accepted').length], ['Total Quoted Value', formatMoney(quotes.reduce((n, q) => n + q.total, 0))]].map(([label, value]) => <section className="panel" key={label}><p>{label}</p><strong>{value}</strong></section>)}</div>}<section className="panel"><h2>{dashboard ? 'Recent quotes' : 'Quote list'}</h2><QuoteTable quotes={dashboard ? quotes.slice(0, 5) : quotes} navigate={navigate} /></section></>}</>
}
