import type { CatalogItem } from './types'
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) }
export function catalogAlert(item: CatalogItem, date = today()) {
  if (item.validUntil && item.validUntil < date) return 'Precio vencido: revisa antes de cotizar'
  const elapsed = (Date.parse(date) - Date.parse(item.reviewedAt.slice(0,10))) / 86400000
  return elapsed >= item.staleAfterDays ? 'Precio antiguo: puede estar desactualizado' : ''
}
