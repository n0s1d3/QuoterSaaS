import { findCustomer } from './customers'
import { HttpError } from '../http'
export const summaryColumns = 'q.id, q.quote_number AS quoteNumber, c.name AS customerName, q.status, q.expiry_date AS expiryDate, q.issue_date AS issueDate, q.subtotal, q.tax, q.discount, q.total'
export async function getQuote(db: D1Database, org: string, id: string) {
  const quote = await db.prepare(`SELECT ${summaryColumns}, q.customer_id AS customerId, q.expiry_date AS expiryDate, q.notes, q.payment_terms AS paymentTerms, q.surcharge, q.surcharge_type AS surchargeType, q.surcharge_value AS surchargeValue, q.branding_snapshot AS brandingSnapshot, q.branding_captured_at AS brandingCapturedAt FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.organization_id = ? AND q.id = ?`).bind(org, id).first<{customerId: string; brandingSnapshot: string | null; paymentTerms:string|null}>()
  if (!quote) throw new HttpError(404, 'Quote not found')
  const customer = await findCustomer(db, org, quote.customerId)
  const items = (await db.prepare('SELECT id, catalog_item_id AS catalogItemId, unit, duration, valid_until AS validUntil, description, quantity, unit_price AS unitPrice, tax_rate AS taxRate, line_subtotal AS lineSubtotal, line_tax AS lineTax, line_total AS lineTotal FROM quote_items WHERE quote_id = ? ORDER BY sort_order').bind(id).all()).results
  const { brandingSnapshot, ...details } = quote
  return { ...details, customer, items, branding: brandingSnapshot ? JSON.parse(brandingSnapshot) : null }
}
