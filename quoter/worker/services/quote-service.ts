import { auditStatement } from '../db/audit.ts'
import type { Account } from '../auth/session'
import { captureBranding } from '../db/branding.ts'
import { calculateQuote } from '../../src/lib/quote-calculator.ts'
import { HttpError, text } from '../http.ts'
import { findCustomer } from '../db/customers.ts'
import { getQuote } from '../db/quotes.ts'
function date(value: unknown, name: string, required = false) {
  const result = text(value, name, required, 10)
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result)) throw new HttpError(400, `El campo ${name} no es válido`)
  return result
}
export async function createQuote(db: D1Database, org: string, data: Record<string, unknown>, existingId?: string, actor?: Account) {
  const previous = existingId ? await getQuote(db, org, existingId) : null
  if (existingId) {
    if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) throw new HttpError(400, 'Se requiere la revisión cargada de la cotización')
    if (data.revision !== previous!.revision) throw new HttpError(409, 'La cotización cambió. Recarga antes de editar; tus cambios no se guardaron.')
  }
  const customerId = text(data.customerId, 'Customer', true, 100)!
  if (!await findCustomer(db, org, customerId)) throw new HttpError(400, 'El cliente no pertenece a este negocio')
  const issueDate = date(data.issueDate, 'Issue date', true)
  const expiryDate = date(data.expiryDate, 'Expiration date')
  if (expiryDate && expiryDate < issueDate!) throw new HttpError(400, 'El vencimiento es anterior a la emisión')
  const defaults=await db.prepare('SELECT payment_terms AS paymentTerms FROM organizations WHERE id=?').bind(org).first<{paymentTerms:string|null}>()
  const paymentTerms=data.paymentTerms!==undefined?text(data.paymentTerms,'Payment terms',false,2000):previous?previous.paymentTerms:defaults?.paymentTerms||null
  const notes = text(data.notes, 'Notes', false, 10000)
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw new HttpError(400, 'Agrega entre 1 y 100 partidas')
  const items = data.items.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Partida inválida')
    const item = raw as Record<string, unknown>
    const description = text(item.description, 'Description', true, 2000)!
    if (typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number' || (item.taxRate !== undefined && typeof item.taxRate !== 'number')) throw new HttpError(400, 'Los importes de las partidas deben ser números')
    const catalogItemId=text(item.catalogItemId,'Catalog item',false,100)
    const unit=text(item.unit,'Unit',false,50) || 'unidad'
    const duration=text(item.duration,'Duration',false,200)
    const validUntil=date(item.validUntil,'Item validity')
    return { description, quantity: item.quantity, unitPrice: item.unitPrice, taxRate: 0, catalogItemId, unit, duration, validUntil }
  })
  const catalogIds = [...new Set(items.map(item => item.catalogItemId).filter((id): id is string => id !== null))]
  if (catalogIds.length) {
    const matches = await db.prepare('SELECT id FROM catalog_items WHERE organization_id=? AND id IN (SELECT value FROM json_each(?))').bind(org, JSON.stringify(catalogIds)).all<{id:string}>()
    if (matches.results.length !== catalogIds.length) throw new HttpError(400, 'La partida del catálogo no pertenece a este negocio')
  }
  const additional = { type: (data.surchargeType ?? 'none') as 'none' | 'fixed' | 'percent', value: (data.surchargeValue ?? 0) as number }
  let totals
  try { totals = calculateQuote(items, data.discount === undefined ? 0 : data.discount as number, additional) } catch (error) { throw new HttpError(400, (error as Error).message) }
  const id = existingId || crypto.randomUUID()
  const operation = crypto.randomUUID()
  const gate = 'EXISTS (SELECT 1 FROM quotes WHERE id=? AND organization_id=? AND deleted_at IS NULL AND write_token=?)'
  const gateValues = [id,org,operation]
  // D1 batch is transactional: sequence allocation, quote and items commit together.
  // The unique organization/number index provides an additional consistency guard.
  const statements = [
    ...(existingId ? [
      db.prepare('UPDATE quotes SET customer_id=?, issue_date=?, expiry_date=?, subtotal=?, discount=?, tax=?, total=?, notes=?, updated_at=CURRENT_TIMESTAMP,revision=revision+1,write_token=? WHERE id=? AND organization_id=? AND deleted_at IS NULL AND revision=?').bind(customerId, issueDate, expiryDate, totals.subtotal, totals.discount, totals.tax, totals.total, notes, operation, id, org, data.revision),
      db.prepare(`DELETE FROM quote_items WHERE quote_id=? AND ${gate}`).bind(id,...gateValues),
    ] : [
    db.prepare('INSERT INTO quote_sequences (organization_id, value) VALUES (?, 1) ON CONFLICT(organization_id) DO UPDATE SET value = value + 1').bind(org),
    db.prepare("INSERT INTO quotes (id, organization_id, customer_id, quote_number, issue_date, expiry_date, subtotal, discount, tax, total, notes,write_token) VALUES (?, ?, ?, (SELECT printf('Q-%04d', value) FROM quote_sequences WHERE organization_id = ?), ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, org, customerId, org, issueDate, expiryDate, totals.subtotal, totals.discount, totals.tax, totals.total, notes,operation),
    ]),
    db.prepare(`UPDATE quotes SET payment_terms=? WHERE ${gate}`).bind(paymentTerms,...gateValues),
    db.prepare(`UPDATE quotes SET surcharge_type=?,surcharge_value=?,surcharge=? WHERE ${gate}`).bind(additional.type,additional.value,totals.surcharge,...gateValues),
    ...(!existingId ? [captureBranding(db, org, id)] : []),
    db.prepare(`INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order, catalog_item_id, unit, duration, valid_until)
      SELECT json_extract(value,'$.id'), ?, json_extract(value,'$.description'), json_extract(value,'$.quantity'), json_extract(value,'$.unitPrice'), json_extract(value,'$.taxRate'), json_extract(value,'$.lineSubtotal'), json_extract(value,'$.lineTax'), json_extract(value,'$.lineTotal'), CAST(key AS INTEGER), json_extract(value,'$.catalogItemId'), json_extract(value,'$.unit'), json_extract(value,'$.duration'), json_extract(value,'$.validUntil')
      FROM json_each(?) WHERE ${gate}`).bind(id,JSON.stringify(totals.items.map(item=>({...item,id:crypto.randomUUID()}))),...gateValues),
    ...(actor ? [auditStatement(db,actor,existingId?'quote.edited':'quote.created',id,{}, {sql:gate,values:gateValues})] : []),
  ]
  const result = await db.batch(statements)
  if(existingId && !result[0].meta.changes)throw new HttpError(409,'La cotización cambió durante el guardado. Recarga antes de editar.')
  return getQuote(db, org, id)
}
