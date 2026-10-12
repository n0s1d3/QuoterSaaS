export const customerColumns = 'id, name, company, phone, email, tax_id AS taxId, address'
export async function findCustomer(db: D1Database, org: string, id: string) {
  return db.prepare(`SELECT ${customerColumns} FROM customers WHERE organization_id = ? AND id = ?`).bind(org, id).first()
}
