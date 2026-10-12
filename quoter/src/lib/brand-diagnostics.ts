import type { Branding } from './types'
export interface DiagnosticEntry { time: string; event: string; detail: string }
const key = 'quoter-brand-diagnostics'
const listeners = new Set<() => void>()
let entries: DiagnosticEntry[] = []
try { entries = JSON.parse(localStorage.getItem(key) || '[]').filter((entry: DiagnosticEntry) => typeof entry.event === 'string' && typeof entry.detail === 'string').slice(-60) } catch { /* Storage may be unavailable. */ }
export function brandLog(event: string, detail = '') {
  entries = [...entries, { time: new Date().toISOString(), event, detail: detail.replace(/data:image[^\s]+/g, '[imagen omitida]').slice(0, 800) }].slice(-60)
  try { localStorage.setItem(key, JSON.stringify(entries)) } catch { /* Keep diagnostics in memory. */ }
  listeners.forEach(listener => listener())
}
export function brandMetadata(brand: Branding | null | undefined) {
  return JSON.stringify({ hasBrand: !!brand, hasLogo: !!brand?.logo, logoCharacters: brand?.logo?.length || 0, logoFormat: brand?.logo?.split(';')[0], primaryColor: brand?.primaryColor, accentColor: brand?.accentColor })
}
export function diagnostics() { return entries }
export function subscribeDiagnostics(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function clearDiagnostics() { entries = []; try { localStorage.removeItem(key) } catch { /* Optional storage. */ } listeners.forEach(listener => listener()) }
