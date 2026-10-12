import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { statuses } from '../lib/statuses'
import type { Branding, QuoteDetail } from '../lib/types'
import { formatMoney } from '../lib/money'
export default function QuoteDetails({ id }: { id: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [brand, setBrand] = useState<Branding | null>(null)
  useEffect(() => { api<Branding>('/branding').then(setBrand).catch(() => {}) }, [])
  const [error, setError] = useState('')
  useEffect(() => { api<QuoteDetail>(`/quotes/${encodeURIComponent(id)}`).then(setQuote).catch(e => setError(e.message)) }, [id])
  if (error) return <p className="error" role="alert">{error}</p>
  if (!quote) return <p>Loading quote…</p>
  return <><div className="page-heading"><div><p className="eyebrow">QUOTE DETAILS</p><h1 style={{color: brand?.primaryColor}}>{quote.quoteNumber}</h1>{brand?.logo && <img className="business-logo" src={brand.logo} alt="Logo del negocio" />}<p>{brand?.name || "Mi negocio"} · GTQ</p></div><span className="badge">{statuses[quote.status] || quote.status}</span></div><section className="panel fields"><div><h2>Customer</h2><strong>{quote.customer.name}</strong><p>{quote.customer.company}</p><p>{quote.customer.email}</p><p>{quote.customer.phone}</p><p>{quote.customer.address}</p>{quote.customer.taxId && <p>Tax ID: {quote.customer.taxId}</p>}</div><div><h2>Issue date</h2><p>{quote.issueDate}</p></div><div><h2>Expiration date</h2><p>{quote.expiryDate || '—'}</p></div></section><section className="panel"><h2>Items</h2><div className="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr></thead><tbody>{quote.items.map((item, i) => <tr key={i}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td>{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div></section><div className="builder-bottom"><section className="panel"><h2>Notes</h2><p className="notes">{quote.notes || 'No additional notes.'}</p></section><section className="panel totals">{[['Subtotal', quote.subtotal], ...(quote.tax ? [['Impuestos anteriores', quote.tax]] : []), ['Discount', quote.discount], ['Total', quote.total]].map(([label, value]) => <div key={label} className={label === 'Total' ? 'grand-total' : ''}><span>{label}</span><strong>{formatMoney(Number(value))}</strong></div>)}</section></div></>
}
