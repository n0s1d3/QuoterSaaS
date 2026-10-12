import { useEffect, useState } from 'react'
import { clearDiagnostics, diagnostics, subscribeDiagnostics } from '../lib/brand-diagnostics'
export default function BrandDiagnostics() {
  const [entries, setEntries] = useState(diagnostics)
  const [message, setMessage] = useState('')
  useEffect(() => subscribeDiagnostics(() => setEntries(diagnostics())), [])
  async function copy() { try { await navigator.clipboard.writeText(JSON.stringify(entries, null, 2)); setMessage('Registro copiado.') } catch { setMessage('No se pudo copiar; puedes seleccionar el registro manualmente.') } }
  return <details className="panel diagnostics"><summary>Diagnóstico de marca y PDF ({entries.length} eventos)</summary><p>Registro local de carga, guardado y generación. No incluye la imagen ni datos del cliente.</p><div className="detail-actions"><button type="button" className="secondary" onClick={() => { void copy() }}>Copiar registro</button><button type="button" className="subtle" onClick={clearDiagnostics}>Limpiar registro</button></div>{message && <p role="status">{message}</p>}<pre>{entries.map(e => `${e.time} | ${e.event}\n${e.detail}`).join('\n\n') || 'Sin eventos todavía.'}</pre></details>
}
