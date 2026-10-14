import QuoteHistory from '../components/QuoteHistory'
import { useEffect, useState } from 'react'
import { usePermissions } from '../lib/role'
import { brandLog, brandMetadata } from '../lib/brand-diagnostics'
import { api } from '../lib/api'
import { statuses } from '../lib/statuses'
import type { Branding, QuoteDetail } from '../lib/types'
import { formatMoney } from '../lib/money'
export default function QuoteDetails({ id, navigate }: { id: string; navigate: (path: string) => void }) {
  const {canEdit,isOwner}=usePermissions()
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [brand, setBrand] = useState<Branding | null>(null)
  const [brandError, setBrandError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [brandMessage, setBrandMessage] = useState('')
  const [updatingBrand, setUpdatingBrand] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  async function remove() {
    if (!quote || !isOwner || deleting) return
    if (!window.confirm(`¿Eliminar ${quote.quoteNumber} de ${quote.customer.name}? Podrás recuperarla desde Datos y recuperación.`)) return
    setDeleting(true); setDeleteError('')
    try { await api(`/quotes/${id}`, {}, 'DELETE'); navigate('/quotes') }
    catch(e) { setDeleteError((e as Error).message) }
    finally { setDeleting(false) }
  }
  async function refreshBrand() {
    if (!window.confirm('¿Actualizar esta cotización con la marca actual del negocio? La marca anterior será reemplazada.')) return
    setUpdatingBrand(true); setBrandError('')
    try { const updated = await api<QuoteDetail>(`/quotes/${id}`, { refreshBranding: true }, 'PATCH'); setQuote(updated); setBrand(updated.branding || null); setBrandMessage('Marca actualizada para esta cotización.'); brandLog('cotizacion.marca.actualizada', brandMetadata(updated.branding)) }
    catch(e) { setBrandError((e as Error).message); brandLog('cotizacion.marca.error', (e as Error).message) }
    finally { setUpdatingBrand(false) }
  }
  async function download() {
    if (!quote || !brand) return
    setDownloading(true); setPdfError('')
    try {
      const latestQuote = await api<QuoteDetail>(`/quotes/${id}`)
      if (!latestQuote.branding) throw new Error('La cotización no tiene marca guardada. Actualiza su marca.')
      const latestBrand = latestQuote.branding
      setQuote(latestQuote); setBrand(latestBrand)
      brandLog('pdf.marca.snapshot', brandMetadata(latestBrand))
      const { downloadQuotePdf } = await import('../lib/quote-pdf')
      downloadQuotePdf(latestQuote, latestBrand, brandLog)
      brandLog('pdf.generado', `Logo incluido: ${!!latestBrand.logo}`)
    }
    catch(e) { const detail = e instanceof Error ? e.message : String(e); brandLog('pdf.error', detail); setPdfError(`No se pudo generar el PDF: ${detail}`) }
    finally { setDownloading(false) }
  }
  const [error, setError] = useState('')
  useEffect(() => { api<QuoteDetail>(`/quotes/${encodeURIComponent(id)}`).then(q => { setQuote(q); setBrand(q.branding || null); brandLog('cotizacion.marca.cargada', brandMetadata(q.branding)) }).catch(e => setError(e.message)) }, [id])
  if (error) return <p className="error" role="alert">{error}</p>
  if (!quote) return <p>Cargando cotización…</p>
  return <><div className="page-heading"><div><p className="eyebrow">DETALLE DE COTIZACIÓN</p><h1 style={{color: brand?.primaryColor}}>{quote.quoteNumber}</h1>{brand?.logo && <img className="business-logo" src={brand.logo} alt="Logo del negocio" />}<p>{brand?.name || "Mi negocio"} · GTQ</p></div><div className="detail-actions"><button disabled={!brand || downloading} onClick={() => { void download() }}>{downloading ? "Generando PDF…" : "Descargar PDF"}</button><span className="badge">{statuses[quote.status] || quote.status}</span>{canEdit&&<button className="secondary" onClick={() => navigate(`/quotes/${id}/edit`)}>Editar cotización</button>}</div></div>{(pdfError || brandError) && <p className="error" role="alert">{pdfError || `No se pudo cargar la marca: ${brandError}. Recarga la página para descargar el PDF.`}</p>}<section className="panel"><h2>Marca de esta cotización</h2><p>Esta cotización conserva su logo, nombre y colores guardados. Cambiar Mi negocio no modifica esta copia.</p><div className="detail-actions"><button className="secondary" disabled={updatingBrand || downloading} onClick={() => { setBrandMessage("Se conserva la marca guardada de esta cotización."); brandLog("cotizacion.marca.conservada", brandMetadata(brand)) }}>Mantener marca guardada</button>{canEdit&&<button className="secondary" disabled={updatingBrand || downloading} onClick={() => { void refreshBrand() }}>{updatingBrand ? "Actualizando…" : "Actualizar a la marca actual"}</button>}</div>{brandMessage && <p role="status">{brandMessage}</p>}</section><section className="panel fields"><div><h2>Cliente</h2><strong>{quote.customer.name}</strong><p>{quote.customer.company}</p><p>{quote.customer.email}</p><p>{quote.customer.phone}</p><p>{quote.customer.address}</p>{quote.customer.taxId && <p>NIT: {quote.customer.taxId}</p>}</div><div><h2>Fecha de emisión</h2><p>{quote.issueDate}</p></div><div><h2>Válida hasta</h2><p>{quote.expiryDate || '—'}</p></div></section><section className="panel"><h2>Partidas</h2><div className="table-wrap"><table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead><tbody>{quote.items.map((item, i) => <tr key={i}><td>{item.description}<small className="item-meta">Unidad: {item.unit || "unidad"}{item.duration && ` · Tiempo: ${item.duration}`}{item.validUntil && ` · Vigencia: ${item.validUntil}`}</small></td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td>{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div></section><div className="builder-bottom"><section className="panel"><h2>Condiciones de pago</h2><p className="notes">{quote.paymentTerms || "No especificadas."}</p><h2>Notas</h2><p className="notes">{quote.notes || 'Sin notas adicionales.'}</p></section><section className="panel totals">{[['Subtotal', quote.subtotal], ...(quote.tax ? [['Impuestos anteriores', quote.tax]] : []), ['Descuento', quote.discount], ...(quote.surcharge ? [['Adicional por facturación', quote.surcharge]] : []), ['Total', quote.total]].map(([label, value]) => <div key={label} className={label === 'Total' ? 'grand-total' : ''}><span>{label}</span><strong>{formatMoney(Number(value))}</strong></div>)}</section></div><QuoteHistory id={id}/>{isOwner&&<section className="panel quote-delete-section"><h2>Eliminar cotización</h2><p>La cotización se moverá a la papelera. Puedes recuperarla desde Datos y recuperación.</p>{deleteError&&<p className="error" role="alert">{deleteError}</p>}<button type="button" className="danger" disabled={deleting || downloading || updatingBrand} onClick={() => {void remove()}}>{deleting ? 'Eliminando…' : 'Eliminar cotización'}</button></section>}</>
}
