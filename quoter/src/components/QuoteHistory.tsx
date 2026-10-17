import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { auditLabels, auditTime, type AuditEvent } from '../lib/audit'
import { statuses } from '../lib/statuses'
export default function QuoteHistory({ id }: { id: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]), [error, setError] = useState(''), [revision, setRevision] = useState(0), [open, setOpen] = useState(false), [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    api<AuditEvent[]>(`/quotes/${id}/history`, undefined, 'GET', { signal: controller.signal }).then(rows => { if (!controller.signal.aborted) { setEvents(rows); setError('') } }).catch(error => { if (!controller.signal.aborted) setError(error.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, revision, open])
  return <details className="panel" onToggle={event => {setOpen(event.currentTarget.open);if(event.currentTarget.open)setLoading(true)}}><summary>Historial de la cotización</summary>{open && <><button className="secondary history-refresh" disabled={loading} onClick={() => {setLoading(true);setRevision(n => n + 1)}}>Actualizar historial</button>{loading && <p role="status">Cargando historial…</p>}{error && <p className="error" role="alert">{error}</p>}<ol className="audit-list">{events.map(event => {
    let status = ''
    try { const detail: unknown = JSON.parse(event.detail); if (detail && typeof detail === 'object' && 'status' in detail && typeof detail.status === 'string') status = detail.status } catch { /* Older malformed history must not prevent viewing a quote. */ }
    return <li key={event.id}><strong>{auditLabels[event.action] || event.action}{status && ` · ${statuses[status] || status}`}</strong><small>{event.actorEmail} · {auditTime(event.createdAt)}</small></li>
  })}</ol>{!events.length && !error && !loading && <p className="hint">Los cambios anteriores a esta actualización no tienen historial registrado.</p>}</>}</details>
}
