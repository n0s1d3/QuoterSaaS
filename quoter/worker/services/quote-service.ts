import { captureBranding } from '../db/branding'
import { calculateQuote } from '../../src/lib/quote-calculator'
import { HttpError, text } from '../http'
import { findCustomer } from '../db/customers'
import { getQuote } from '../db/quotes'
function date(value: unknown, name: string, required = false) {
  const result = text(value, name, required, 10)
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result)) throw new HttpError(400, `${name} is invalid`)
  return result
}
export async function createQuote(db: D1Database, org: string, data: Record<string, unknown>, existingId?: string) {
  if (existingId) await getQuote(db, org, existingId)
  const customerId = text(data.customerId, 'Customer', true, 100)!
  if (!await findCustomer(db, org, customerId)) throw new HttpError(400, 'Customer does not belong to this organization')
  const issueDate = date(data.issueDate, 'Issue date', true)
  const expiryDate = date(data.expiryDate, 'Expiration date')
  if (expiryDate && expiryDate < issueDate!) throw new HttpError(400, 'Expiration date precedes issue date')
  const notes = text(data.notes, 'Notes', false, 10000)
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw new HttpError(400, 'Provide between 1 and 100 items')
  const items = data.items.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Invalid item')
    const item = raw as Record<string, unknown>
    const description = text(item.description, 'Description', true, 2000)!
    if (typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number' || (item.taxRate !== undefined && typeof item.taxRate !== 'number')) throw new HttpError(400, 'Item amounts must be numbers')
    return { description, quantity: item.quantity, unitPrice: item.unitPrice, taxRate: 0 }
  })
  let totals
  try { totals = calculateQuote(items, data.discount === undefined ? 0 : data.discount as number) } catch (error) { throw new HttpError(400, (error as Error).message) }
  const id = existingId || crypto.randomUUID()
  // D1 batch is transactional: sequence allocation, quote and items commit together.
  // The unique organization/number index provides an additional consistency guard.
  const statements = [
    ...(existingId ? [
      db.prepare('UPDATE quotes SET customer_id=?, issue_date=?, expiry_date=?, subtotal=?, discount=?, tax=?, total=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?').bind(customerId, issueDate, expiryDate, totals.subtotal, totals.discount, totals.tax, totals.total, notes, id, org),
      db.prepare('DELETE FROM quote_items WHERE quote_id=? AND EXISTS (SELECT 1 FROM quotes WHERE id=? AND organization_id=?)').bind(id, id, org),
    ] : [
    db.prepare('INSERT INTO quote_sequences (organization_id, value) VALUES (?, 1) ON CONFLICT(organization_id) DO UPDATE SET value = value + 1').bind(org),
    db.prepare("INSERT INTO quotes (id, organization_id, customer_id, quote_number, issue_date, expiry_date, subtotal, discount, tax, total, notes) VALUES (?, ?, ?, (SELECT printf('Q-%04d', value) FROM quote_sequences WHERE organization_id = ?), ?, ?, ?, ?, ?, ?, ?)").bind(id, org, customerId, org, issueDate, expiryDate, totals.subtotal, totals.discount, totals.tax, totals.total, notes),
    ]),
    ...(!existingId ? [captureBranding(db, org, id)] : []),
    ...totals.items.map((item, index) => db.prepare('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, item.description, item.quantity, item.unitPrice, item.taxRate, item.lineSubtotal, item.lineTax, item.lineTotal, index)),
  ]
  await db.batch(statements)
  return getQuote(db, org, id)
}
