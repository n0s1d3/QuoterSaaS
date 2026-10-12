import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { catalogAlert } from '../lib/catalog'
import CatalogPicker from '../components/CatalogPicker'
import { api } from '../lib/api'
import type { CatalogItem, Customer, QuoteDetail } from '../lib/types'
import { calculateQuote } from '../lib/quote-calculator'
import { formatMoney, toCents } from '../lib/money'
const emptyItem = () => ({ key: crypto.randomUUID(), description: '', quantity: '1', price: '', catalogItemId: null as string | null, unit: 'unidad', duration: '', validUntil: '', warning: '' })
function calendar(input: HTMLInputElement) { try { input.showPicker?.() } catch { /* Native input remains usable. */ } }
export default function QuoteBuilder({ navigate, quoteId }: { navigate: (path: string) => void; quoteId?: string }) {
  const [loaded, setLoaded] = useState(!quoteId)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [historicalTax, setHistoricalTax] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('new')
  const [customer, setCustomer] = useState({ name: '', company: '', phone: '', email: '' })
  const [issueDate, setIssueDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
  const [expiryDate, setExpiryDate] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [surchargeType,setSurchargeType] = useState<'none'|'fixed'|'percent'>('none')
  const [surchargeValue,setSurchargeValue] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api<Customer[]>('/customers').then(setCustomers).catch(e => setError(e.message)) }, [])
  useEffect(() => {
    if (!quoteId) return
    let active = true
    api<QuoteDetail>(`/quotes/${quoteId}`).then(q => {
      if (!active) return
      setCustomerId(q.customer.id); setIssueDate(q.issueDate); setExpiryDate(q.expiryDate || '')
      setItems(q.items.map(item => ({ key: crypto.randomUUID(), description: item.description, quantity: String(item.quantity), price: (item.unitPrice / 100).toFixed(2), catalogItemId: item.catalogItemId || null, unit: item.unit || 'unidad', duration: item.duration || '', validUntil: item.validUntil || '', warning: '' })))
      setSurchargeType(q.surchargeType || 'none'); setSurchargeValue(((q.surchargeValue || 0)/100).toFixed(2))
      setDiscount((q.discount / 100).toFixed(2)); setNotes(q.notes || ''); setQuoteNumber(q.quoteNumber); setHistoricalTax(q.tax > 0); setLoaded(true)
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [quoteId])
  let preview: ReturnType<typeof calculateQuote> | undefined; let calculationError = ''
  try { preview = calculateQuote(items.map(item => ({ description: item.description, quantity: Number(item.quantity), catalogItemId: item.catalogItemId, unit: item.unit, duration: item.duration, validUntil: item.validUntil || null, unitPrice: toCents(item.price || '0'), taxRate: 0 })), toCents(discount || '0'), {type:surchargeType,value:toCents(surchargeValue || '0')}) } catch (e) { calculationError = (e as Error).message }
  function update(key: string, field: string, value: string) { setItems(items.map(item => item.key === key ? { ...item, [field]: value } : item)) }
  function addCatalog(item: CatalogItem) {
    const row = {...emptyItem(), description: item.name + (item.description ? ` — ${item.description}` : ''), price:(item.unitPrice/100).toFixed(2),catalogItemId:item.id,unit:item.unit,duration:item.duration||'',validUntil:item.validUntil||'',warning:catalogAlert(item)}
    setItems(rows => rows.length===1 && !rows[0].description && !rows[0].price ? [row] : [...rows,row])
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); if (!preview) { setError(calculationError); return }; setSaving(true)
    try {
      let id = customerId
      if (id === 'new') { const created = await api<Customer>('/customers', customer); id = created.id; setCustomers([...customers, created]); setCustomerId(id) }
      const quote = await api<QuoteDetail>(quoteId ? `/quotes/${quoteId}` : '/quotes', { customerId: id, issueDate, expiryDate: expiryDate || null, notes, discount: preview.discount, surchargeType, surchargeValue:toCents(surchargeValue || "0"), items: preview.items.map(({ description, quantity, unitPrice, catalogItemId, unit, duration, validUntil }) => ({ description, quantity, unitPrice, catalogItemId, unit, duration, validUntil })) }, quoteId ? 'PUT' : 'POST')
      navigate(`/quotes/${quote.id}`)
    } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  if (!loaded) return <>{error ? <p role="alert" className="error">{error}</p> : <p>Cargando cotización…</p>}<button className="secondary" onClick={() => navigate(quoteId ? `/quotes/${quoteId}` : "/quotes")}>Volver</button></>
  return <><div className="page-heading"><div><p className="eyebrow">COTIZACIONES</p><h1>{quoteId ? `Editar ${quoteNumber}` : "Nueva cotización"}</h1><p>Cliente, partidas y listo.</p></div>{quoteId && <button type="button" className="secondary" onClick={() => navigate(`/quotes/${quoteId}`)}>Cancelar</button>}</div><form onSubmit={submit}>{historicalTax && <p className="error">Esta cotización tenía impuestos. Al guardar se recalculará sin impuestos.</p>}{error && <p role="alert" className="error">{error}</p>}
    <section className="panel"><h2>1. ¿Para quién?</h2><label>Cliente<select aria-label="Cliente" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="new">+ Nuevo cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</select></label>{customerId === 'new' && <div className="fields inline-customer">{[['name','Nombre'],['company','Empresa'],['phone','Teléfono'],['email','Correo']].map(([key,label]) => <label key={key}>{label}<input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={key === 'name'} maxLength={key === 'phone' ? 100 : 200} value={customer[key as keyof typeof customer]} onChange={e => setCustomer({ ...customer, [key]: e.target.value })} /></label>)}</div>}<div className="fields inline-customer"><label>Fecha de emisión<input type="date" required value={issueDate} onClick={e => calendar(e.currentTarget)} onChange={e => setIssueDate(e.target.value)} /></label><label>Válida hasta<input type="date" min={issueDate} value={expiryDate} onClick={e => calendar(e.currentTarget)} onChange={e => setExpiryDate(e.target.value)} /></label></div></section>
    <section className="panel"><div className="section-heading"><h2>2. ¿Qué vas a cotizar?</h2><button type="button" className="secondary" disabled={items.length >= 100} onClick={() => setItems([...items, emptyItem()])}>+ Agregar partida</button></div><CatalogPicker select={addCatalog} disabled={items.length>=100}/><div className="item-stack">{items.map((item,i) => <article className="item-card" key={item.key}><div className="section-heading"><strong>Partida {i+1}</strong><button type="button" className="subtle" aria-label={`Eliminar partida ${i+1}`} disabled={items.length === 1} onClick={() => setItems(items.filter(row => row.key !== item.key))}>Eliminar</button></div><label>Descripción<input aria-label={`Descripción ${i+1}`} required maxLength={2000} placeholder="Producto o servicio" value={item.description} onChange={e => update(item.key,'description',e.target.value)} /></label><div className="item-values"><label>Cantidad<input aria-label={`Cantidad ${i+1}`} type="number" inputMode="decimal" min="0.000001" step="any" required value={item.quantity} onChange={e => update(item.key,'quantity',e.target.value)} /></label><label>Precio unitario (Q)<input aria-label={`Precio ${i+1}`} type="number" inputMode="decimal" min="0" step="0.01" required value={item.price} onChange={e => update(item.key,'price',e.target.value)} /></label></div><div className="fields inline-customer"><label>Unidad<input aria-label={`Unidad ${i+1}`} maxLength={50} required value={item.unit} onChange={e=>update(item.key,"unit",e.target.value)}/></label><label>Tiempo estimado<input aria-label={`Tiempo ${i+1}`} maxLength={200} value={item.duration} onChange={e=>update(item.key,"duration",e.target.value)}/></label><label>Precio válido hasta<input aria-label={`Vigencia ${i+1}`} type="date" value={item.validUntil} onChange={e=>update(item.key,"validUntil",e.target.value)}/></label></div>{item.warning && <p className="error">{item.warning}</p>}{item.validUntil && item.validUntil < issueDate && <p className="error">El precio de esta partida está vencido. Revísalo antes de guardar.</p>}<div className="line-summary">Importe <strong>{preview ? formatMoney(preview.items[i].lineTotal) : '—'}</strong></div></article>)}</div><button type="button" className="add-item" disabled={items.length >= 100} onClick={() => setItems([...items,emptyItem()])}>+ Agregar otra partida</button></section>
    <div className="builder-bottom"><section className="panel"><label>Notas<textarea rows={4} maxLength={10000} placeholder="Condiciones o detalles adicionales…" value={notes} onChange={e => setNotes(e.target.value)} /></label></section><section className="panel totals"><div><span>Subtotal</span><strong>{formatMoney(preview?.subtotal ?? 0)}</strong></div><label>Descuento (Q)<input type="number" inputMode="decimal" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></label><label>Adicional por facturación<select aria-label="Adicional por facturación" value={surchargeType} onChange={e=>setSurchargeType(e.target.value as typeof surchargeType)}><option value="none">Sin adicional</option><option value="fixed">Monto fijo (Q)</option><option value="percent">Porcentaje (%)</option></select></label>{surchargeType!=="none"&&<label>{surchargeType==="fixed"?"Monto adicional (Q)":"Porcentaje adicional (%)"}<input aria-label={surchargeType==="fixed"?"Monto adicional (Q)":"Porcentaje adicional (%)"} type="number" min="0" step="0.01" value={surchargeValue} onChange={e=>setSurchargeValue(e.target.value)}/><small>El porcentaje se aplica después del descuento.</small></label>}{!!preview?.surcharge&&<div><span>Adicional por facturación</span><strong>{formatMoney(preview.surcharge)}</strong></div>}<div className="grand-total"><span>Total</span><strong>{preview ? formatMoney(preview.total) : '—'}</strong></div>{calculationError && <p className="error">{calculationError}</p>}<button disabled={saving || !preview}>{saving ? 'Guardando…' : quoteId ? 'Guardar cambios' : 'Guardar cotización'}</button></section></div></form></>
}
