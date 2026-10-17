import { HttpError } from '../http.ts'
export const summaryColumns = 'q.id, q.quote_number AS quoteNumber, c.name AS customerName, q.status, q.expiry_date AS expiryDate, q.issue_date AS issueDate, q.subtotal, q.tax, q.discount, q.total, q.revision'
// A single SQLite statement reads header, customer and ordered items from the
// same snapshot, including when another request commits an edit concurrently.
export async function getQuote(db: D1Database, org: string, id: string) {
  const quote = await db.prepare(`SELECT ${summaryColumns}, q.customer_id AS customerId, q.notes, q.payment_terms AS paymentTerms, q.surcharge, q.surcharge_type AS surchargeType, q.surcharge_value AS surchargeValue, q.branding_snapshot AS brandingSnapshot, q.branding_captured_at AS brandingCapturedAt,
    json_object('id', c.id, 'name', c.name, 'company', c.company, 'phone', c.phone, 'email', c.email, 'taxId', c.tax_id, 'address', c.address) AS customerJson,
    (SELECT json_group_array(json_object('id', i.id, 'catalogItemId', i.catalog_item_id, 'unit', i.unit, 'duration', i.duration, 'validUntil', i.valid_until, 'description', i.description, 'quantity', i.quantity, 'unitPrice', i.unit_price, 'taxRate', i.tax_rate, 'lineSubtotal', i.line_subtotal, 'lineTax', i.line_tax, 'lineTotal', i.line_total))
      FROM (SELECT * FROM quote_items WHERE quote_id=q.id ORDER BY sort_order, id) i) AS itemsJson
    FROM quotes q JOIN customers c ON c.id=q.customer_id AND c.organization_id=q.organization_id
    WHERE q.organization_id=? AND q.id=? AND q.deleted_at IS NULL`).bind(org, id).first<{customerId: string; brandingSnapshot: string | null; customerJson:string; itemsJson:string; paymentTerms:string|null;revision:number}>()
  if (!quote) throw new HttpError(404, 'Cotización no encontrada')
  const { brandingSnapshot, customerJson, itemsJson, ...details } = quote
  return { ...details, customer:JSON.parse(customerJson), items:JSON.parse(itemsJson), branding: brandingSnapshot ? JSON.parse(brandingSnapshot) : null }
}
