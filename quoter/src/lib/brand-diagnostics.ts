import type { Branding } from './types'
import { api } from './api'
import { diagnosticEvent, type DiagnosticEvent } from './diagnostic-event'
let pending: DiagnosticEvent[] = []
let timer: ReturnType<typeof setTimeout> | undefined
// Remove diagnostic records left by previous versions; new logs live only on the server.
try { localStorage.removeItem('quoter-brand-diagnostics') } catch { /* Storage is optional. */ }
export function brandLog(event: string, detail = '') {
  let metadata: unknown
  try { metadata = JSON.parse(detail) } catch { /* Raw messages are never sent. */ }
  const entry = diagnosticEvent(event, metadata)
  if (!entry) return
  pending = [...pending, entry].slice(-20)
  if (timer) return
  timer = setTimeout(() => {
    const batch = pending
    pending = []; timer = undefined
    // Diagnostics must not prevent saving a brand or downloading a PDF.
    void api('/diagnostics', { events: batch }).catch(() => {})
  }, 500)
}
export function brandMetadata(brand: Branding | null | undefined) {
  return JSON.stringify({ hasBrand: !!brand, hasLogo: !!brand?.logo, logoCharacters: brand?.logo?.length || 0, logoFormat: brand?.logo?.split(';')[0], primaryColor: brand?.primaryColor, accentColor: brand?.accentColor })
}
export function clearDiagnostics() {
  pending = []
  if (timer) clearTimeout(timer)
  timer = undefined
}
