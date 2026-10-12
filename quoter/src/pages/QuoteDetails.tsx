import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { QuoteDetail } from '../lib/types'
import { formatMoney } from '../lib/money'
export default function QuoteDetails({ id }: { id: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<QuoteDetail>(`/quotes/${encodeURIComponent(id)}`).then(setQuote).catch(e => setError(e.message)) }, [id])
  if (error) return <p className="error" role="alert">{error}</p>
  if (!quote) return <p>Loading quote…</p>
  return <><div className="page-heading"><div><p className="eyebrow">QUOTE DETAILS</p><h1>{quote.quoteNumber}</h1><p>Demo Business · GTQ</p></div><span className="badge">{quote.status}</span></div><section className="panel fields"><div><h2>Customer</h2><strong>{quote.customer.name}</strong><p>{quote.customer.company}</p><p>{quote.customer.email}</p><p>{quote.customer.phone}</p><p>{quote.customer.address}</p>{quote.customer.taxId && <p>Tax ID: {quote.customer.taxId}</p>}</div><div><h2>Issue date</h2><p>{quote.issueDate}</p></div><div><h2>Expiration date</h2><p>{quote.expiryDate || '—'}</p></div></section><section className="panel"><h2>Items</h2><div className="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Tax %</th><th>Tax</th><th>Total</th></tr></thead><tbody>{quote.items.map((item, i) => <tr key={i}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td>{item.taxRate}%</td><td>{formatMoney(item.lineTax)}</td><td>{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div></section><div className="builder-bottom"><section className="panel"><h2>Notes</h2><p className="notes">{quote.notes || 'No additional notes.'}</p></section><section className="panel totals">{[['Subtotal', quote.subtotal], ['Tax', quote.tax], ['Discount', quote.discount], ['Total', quote.total]].map(([label, value]) => <div key={label} className={label === 'Total' ? 'grand-total' : ''}><span>{label}</span><strong>{formatMoney(Number(value))}</strong></div>)}</section></div></>
}
