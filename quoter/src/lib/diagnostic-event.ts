const events = new Set([
  'marca.cargada', 'marca.carga.error', 'marca.guardado.inicio', 'marca.guardado.verificado', 'marca.guardado.error',
  'logo.rechazado', 'logo.seleccionado', 'logo.normalizado', 'logo.lectura.error', 'logo.vista.cargada', 'logo.vista.error',
  'cotizacion.marca.actualizada', 'cotizacion.marca.error', 'cotizacion.marca.cargada', 'cotizacion.marca.conservada',
  'pdf.marca.snapshot', 'pdf.generado', 'pdf.error', 'pdf.logo.decodificado', 'pdf.logo.incrustado',
])
export interface DiagnosticEvent { event: string; metadata: Record<string, string | number | boolean> }
/** Allow only technical metadata, never image contents, customer data or raw errors. */
export function diagnosticEvent(event: unknown, metadata: unknown): DiagnosticEvent | null {
  if (typeof event !== 'string' || !events.has(event)) return null
  const safe: DiagnosticEvent['metadata'] = {}
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    for (const [key, value] of Object.entries(metadata)) {
      if (['hasBrand', 'hasLogo'].includes(key) && typeof value === 'boolean') safe[key] = value
      if (['bytes', 'characters', 'logoCharacters', 'width', 'height'].includes(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000_000) safe[key] = value
      if (['type', 'logoFormat', 'format'].includes(key) && typeof value === 'string' && ['image/png', 'image/jpeg', 'image/webp', 'PNG', 'JPEG', 'WEBP'].includes(value)) safe[key] = value
      if (['primaryColor', 'accentColor'].includes(key) && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) safe[key] = value
    }
  }
  return { event, metadata: safe }
}
