import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { Customer, QuoteDetail } from '../lib/types'
import { calculateQuote } from '../lib/quote-calculator'
import { formatMoney, toCents } from '../lib/money'
const emptyItem = () => ({ key: crypto.randomUUID(), description: '', quantity: '1', price: '', tax: '12' })
export default function QuoteBuilder({ navigate }: { navigate: (path: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
  const [expiryDate, setExpiryDate] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api<Customer[]>('/customers').then(setCustomers).catch(e => setError(e.message)) }, [])
  let preview: ReturnType<typeof calculateQuote> | undefined; let calculationError = ''
  try { preview = calculateQuote(items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPrice: toCents(item.price || '0'), taxRate: Number(item.tax) })), toCents(discount || '0')) } catch (e) { calculationError = (e as Error).message }
  function update(key: string, field: string, value: string) { setItems(items.map(item => item.key === key ? { ...item, [field]: value } : item)) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!preview) { setError(calculationError); return }
    setSaving(true)
    try {
      const quote = await api<QuoteDetail>('/quotes', { customerId, issueDate, expiryDate: expiryDate || null, notes, discount: preview.discount, items: preview.items.map(({ description, quantity, unitPrice, taxRate }) => ({ description, quantity, unitPrice, taxRate })) })
      navigate(`/quotes/${quote.id}`)
    } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  return <><div className="page-heading"><div><p className="eyebrow">QUOTES</p><h1>New quote</h1><p>Build a clear estimate for your customer.</p></div></div>
    <form onSubmit={submit}>
      {error && <p role="alert" className="error">{error}</p>}
      <section className="panel fields"><label>Customer<select aria-label="Customer" required value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Select a customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</select></label><label>Issue date<input type="date" required value={issueDate} onChange={e => setIssueDate(e.target.value)} /></label><label>Expiration date<input type="date" min={issueDate} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></label></section>
      <section className="panel"><h2>Line items</h2><div className="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price (Q)</th><th>Tax %</th><th>Line total</th><th></th></tr></thead><tbody>{items.map((item, i) => <tr key={item.key}><td><input aria-label={`Description ${i + 1}`} required maxLength={2000} value={item.description} onChange={e => update(item.key, 'description', e.target.value)} /></td><td><input aria-label={`Quantity ${i + 1}`} type="number" min="0.000001" step="any" required value={item.quantity} onChange={e => update(item.key, 'quantity', e.target.value)} /></td><td><input aria-label={`Unit price ${i + 1}`} type="number" min="0" step="0.01" required value={item.price} onChange={e => update(item.key, 'price', e.target.value)} /></td><td><input aria-label={`Tax ${i + 1}`} type="number" min="0" step="any" required value={item.tax} onChange={e => update(item.key, 'tax', e.target.value)} /></td><td className="amount">{preview ? formatMoney(preview.items[i].lineTotal) : '—'}</td><td><button type="button" className="subtle" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter(row => row.key !== item.key))}>Remove</button></td></tr>)}</tbody></table></div><button type="button" className="secondary" disabled={items.length >= 100} onClick={() => setItems([...items, emptyItem()])}>+ Add item</button></section>
      <div className="builder-bottom"><section className="panel"><label>Notes<textarea rows={5} maxLength={10000} placeholder="Scope, terms or a message for your customer…" value={notes} onChange={e => setNotes(e.target.value)} /></label></section><section className="panel totals"><div><span>Subtotal</span><strong>{formatMoney(preview?.subtotal ?? 0)}</strong></div><div><span>Tax</span><strong>{formatMoney(preview?.tax ?? 0)}</strong></div><label>Discount (Q)<input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></label><div className="grand-total"><span>Total</span><strong>{preview ? formatMoney(preview.total) : '—'}</strong></div>{calculationError && <p className="error">{calculationError}</p>}<button disabled={saving || !customers.length || !preview}>{saving ? 'Saving…' : 'Save quote'}</button></section></div>
    </form></>
}
