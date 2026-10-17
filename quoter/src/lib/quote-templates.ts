export const quoteTemplates = [
  { id: 'default', name: 'Clásica', description: 'El diseño actual, con membrete y tabla tradicional.' },
  { id: 'sidebar', name: 'Lateral', description: 'Una columna de marca acompaña el contenido.' },
  { id: 'minimal', name: 'Minimalista', description: 'Fondo blanco, líneas limpias y filas suaves.' },
  { id: 'corporate', name: 'Corporativa', description: 'Franjas oscuras con acentos de tu marca.' },
] as const
export type QuoteTemplate = typeof quoteTemplates[number]['id']
export function isQuoteTemplate(value: unknown): value is QuoteTemplate {
  return quoteTemplates.some(template => template.id === value)
}
/** Old snapshots deliberately keep the original layout. */
export function resolveQuoteTemplate(value: unknown): QuoteTemplate {
  return isQuoteTemplate(value) ? value : 'default'
}
