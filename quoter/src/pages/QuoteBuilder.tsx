import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { Customer, QuoteDetail } from '../lib/types'
import { calculateQuote } from '../lib/quote-calculator'
import { formatMoney, toCents } from '../lib/money'
const emptyItem = () => ({ key: crypto.randomUUID(), description: '', quantity: '1', price: '' })
function calendar(input: HTMLInputElement) { try { input.showPicker?.() } catch { /* Native input remains usable. */ } }
export default function QuoteBuilder({ navigate }: { navigate: (path: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('new')
  const [customer, setCustomer] = useState({ name: '', company: '', phone: '', email: '' })
  const [issueDate, setIssueDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
  const [expiryDate, setExpiryDate] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api<Customer[]>('/customers').then(setCustomers).catch(e => setError(e.message)) }, [])
  let preview: ReturnType<typeof calculateQuote> | undefined; let calculationError = ''
  try { preview = calculateQuote(items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPrice: toCents(item.price || '0'), taxRate: 0 })), toCents(discount || '0')) } catch (e) { calculationError = (e as Error).message }
  function update(key: string, field: string, value: string) { setItems(items.map(item => item.key === key ? { ...item, [field]: value } : item)) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); if (!preview) { setError(calculationError); return }; setSaving(true)
    try {
      let id = customerId
      if (id === 'new') { const created = await api<Customer>('/customers', customer); id = created.id; setCustomers([...customers, created]); setCustomerId(id) }
      const quote = await api<QuoteDetail>('/quotes', { customerId: id, issueDate, expiryDate: expiryDate || null, notes, discount: preview.discount, items: preview.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) })
      navigate(`/quotes/${quote.id}`)
    } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  return <><div className="page-heading"><div><p className="eyebrow">COTIZACIONES</p><h1>Nueva cotización</h1><p>Cliente, partidas y listo.</p></div></div><form onSubmit={submit}>{error && <p role="alert" className="error">{error}</p>}
    <section className="panel"><h2>1. ¿Para quién?</h2><label>Cliente<select aria-label="Cliente" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="new">+ Nuevo cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</select></label>{customerId === 'new' && <div className="fields inline-customer">{[['name','Nombre'],['company','Empresa'],['phone','Teléfono'],['email','Correo']].map(([key,label]) => <label key={key}>{label}<input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={key === 'name'} maxLength={key === 'phone' ? 100 : 200} value={customer[key as keyof typeof customer]} onChange={e => setCustomer({ ...customer, [key]: e.target.value })} /></label>)}</div>}<div className="fields inline-customer"><label>Fecha de emisión<input type="date" required value={issueDate} onClick={e => calendar(e.currentTarget)} onChange={e => setIssueDate(e.target.value)} /></label><label>Válida hasta<input type="date" min={issueDate} value={expiryDate} onClick={e => calendar(e.currentTarget)} onChange={e => setExpiryDate(e.target.value)} /></label></div></section>
    <section className="panel"><div className="section-heading"><h2>2. ¿Qué vas a cotizar?</h2><button type="button" className="secondary" disabled={items.length >= 100} onClick={() => setItems([...items, emptyItem()])}>+ Agregar partida</button></div><div className="item-stack">{items.map((item,i) => <article className="item-card" key={item.key}><div className="section-heading"><strong>Partida {i+1}</strong><button type="button" className="subtle" aria-label={`Eliminar partida ${i+1}`} disabled={items.length === 1} onClick={() => setItems(items.filter(row => row.key !== item.key))}>Eliminar</button></div><label>Descripción<input aria-label={`Descripción ${i+1}`} required maxLength={2000} placeholder="Producto o servicio" value={item.description} onChange={e => update(item.key,'description',e.target.value)} /></label><div className="item-values"><label>Cantidad<input aria-label={`Cantidad ${i+1}`} type="number" inputMode="decimal" min="0.000001" step="any" required value={item.quantity} onChange={e => update(item.key,'quantity',e.target.value)} /></label><label>Precio unitario (Q)<input aria-label={`Precio ${i+1}`} type="number" inputMode="decimal" min="0" step="0.01" required value={item.price} onChange={e => update(item.key,'price',e.target.value)} /></label></div><div className="line-summary">Importe <strong>{preview ? formatMoney(preview.items[i].lineTotal) : '—'}</strong></div></article>)}</div><button type="button" className="add-item" disabled={items.length >= 100} onClick={() => setItems([...items,emptyItem()])}>+ Agregar otra partida</button></section>
    <div className="builder-bottom"><section className="panel"><label>Notas<textarea rows={4} maxLength={10000} placeholder="Condiciones o detalles adicionales…" value={notes} onChange={e => setNotes(e.target.value)} /></label></section><section className="panel totals"><div><span>Subtotal</span><strong>{formatMoney(preview?.subtotal ?? 0)}</strong></div><label>Descuento (Q)<input type="number" inputMode="decimal" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></label><div className="grand-total"><span>Total</span><strong>{preview ? formatMoney(preview.total) : '—'}</strong></div>{calculationError && <p className="error">{calculationError}</p>}<button disabled={saving || !preview}>{saving ? 'Guardando…' : 'Guardar cotización'}</button></section></div></form></>
}
