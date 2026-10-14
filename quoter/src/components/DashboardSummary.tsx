import QuoteStatusChart from './QuoteStatusChart'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { catalogAlert } from '../lib/catalog'
import { dashboardMetrics } from '../lib/dashboard'
import { formatMoney } from '../lib/money'
import type { CatalogItem, QuoteSummary } from '../lib/types'
export default function DashboardSummary({ quotes, date, navigate }: { quotes: QuoteSummary[]; date: string; navigate: (path: string) => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  useEffect(() => { api<CatalogItem[]>('/catalog').then(setCatalog).catch(() => setCatalogError(true)) }, [])
  const metrics = dashboardMetrics(quotes, date)
  const maximum = Math.max(1, ...metrics.months.flatMap(month => [month.accepted, month.potential]))
  const maxCategory = Math.max(1, ...metrics.categories.map(category => category.count))
  const stale = catalog?.filter(item => item.active && catalogAlert(item, date)) || []
  const reminders = [...metrics.expired.map(quote => ({ quote, label: 'Vencida' })), ...metrics.upcoming.map(quote => ({ quote, label: `Vence ${quote.expiryDate}` }))].slice(0, 4)
  return <section className="dashboard-summary" aria-label="Resumen del negocio">
    <div className="stats compact-stats">{[['Cotizaciones', quotes.length], ['Monto aceptado', formatMoney(metrics.acceptedTotal)], ['Monto potencial', formatMoney(metrics.potentialTotal)], ['Aceptadas', metrics.acceptedCount]].map(([label, value]) => <section className="panel" key={label}><p>{label}</p><strong>{value}</strong></section>)}</div>
    <p className="dashboard-hint">GTQ · Montos cotizados, sin descontar costos. Potencial: borradores y enviadas vigentes.</p>
    <div className="dashboard-charts">
      <section className="panel"><h2>Montos aceptados y potenciales</h2><p className="dashboard-hint">Últimos 6 meses, según fecha de emisión.</p><div className="chart-legend"><span><i className="accepted-key"/>Aceptado</span><span><i className="potential-key"/>Potencial</span></div>
        <div className="monthly-chart" role="img" aria-label={metrics.months.map(month => `${month.key}: aceptado ${formatMoney(month.accepted)}, potencial ${formatMoney(month.potential)}`).join('; ')}>{metrics.months.map(month => <div className="chart-month" key={month.key}><div className="month-bars"><div className="month-bar accepted-bar" style={{ height: `${month.accepted / maximum * 100}%` }} title={`${month.key}: aceptado ${formatMoney(month.accepted)}`}/><div className="month-bar potential-bar" style={{ height: `${month.potential / maximum * 100}%` }} title={`${month.key}: potencial ${formatMoney(month.potential)}`}/></div><span>{month.label}</span></div>)}</div>
        <details className="chart-values"><summary>Ver valores por mes</summary><div className="table-wrap"><table><thead><tr><th>Mes</th><th>Aceptado</th><th>Potencial</th></tr></thead><tbody>{metrics.months.map(month => <tr key={month.key}><td>{month.key}</td><td>{formatMoney(month.accepted)}</td><td>{formatMoney(month.potential)}</td></tr>)}</tbody></table></div></details>
      </section>
      <QuoteStatusChart quotes={quotes} navigate={navigate}/><section className="panel"><h2>Cotizaciones por categoría</h2><p className="dashboard-hint">Catálogo actual · Una cotización puede contar en varias categorías.</p><div className="category-chart">{metrics.categories.map(category => <div className="category-row" key={category.name}><div><span>{category.name}</span><strong>{category.count}</strong></div><div className="category-track"><div style={{ width: `${category.count / maxCategory * 100}%` }}/></div></div>)}{!metrics.categories.length && <p className="dashboard-hint">Aún no hay cotizaciones para graficar.</p>}</div></section>
      <section className="panel dashboard-reminders"><h2>Recordatorios de un vistazo</h2><div className="reminder-counts"><span><strong>{metrics.expired.length}</strong> vencidas</span><span><strong>{metrics.upcoming.length}</strong> vencen en 7 días</span><span><strong>{metrics.drafts.length}</strong> borradores</span></div><div className="reminder-list">{reminders.map(({ quote, label }) => <button className="reminder-link" key={quote.id} onClick={() => navigate(`/quotes/${quote.id}`)}><span>{quote.quoteNumber} · {quote.customerName}</span><small>{label}</small></button>)}</div>{!reminders.length && <p className="dashboard-hint">No hay vencimientos pendientes.</p>}{metrics.drafts.length > 0 && <button className="secondary" onClick={() => navigate(`/quotes/${metrics.drafts[0].id}`)}>Revisar un borrador</button>}<div className="catalog-reminder">{catalogError ? <p className="dashboard-hint">No se pudieron consultar los precios del catálogo.</p> : catalog === null ? <p className="dashboard-hint">Revisando precios…</p> : <><p><strong>{stale.length}</strong> precios por revisar</p>{stale.length > 0 && <button className="secondary" onClick={() => navigate('/catalog')}>Revisar catálogo</button>}</>}</div></section>
    </div>
  </section>
}
