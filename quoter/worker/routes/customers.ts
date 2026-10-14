import { body, HttpError, text } from '../http'
import { customerColumns } from '../db/customers'
export async function customers(request: Request, db: D1Database, org: string) {
  if (request.method === 'GET') return Response.json((await db.prepare(`SELECT ${customerColumns} FROM customers WHERE organization_id = ? ORDER BY name`).bind(org).all()).results)
  if (request.method !== 'POST') throw new HttpError(405, 'Operación no permitida')
  const data = await body(request)
  const name = text(data.name, 'Name', true, 200)
  const company = text(data.company, 'Company', false, 200)
  const phone = text(data.phone, 'Phone', false, 100)
  const email = text(data.email, 'Email', false, 254)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Correo inválido')
  const taxId = text(data.taxId, 'Tax ID', false, 100)
  const address = text(data.address, 'Address')
  const id = crypto.randomUUID()
  await db.prepare('INSERT INTO customers (id, organization_id, name, company, phone, email, tax_id, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, org, name, company, phone, email, taxId, address).run()
  return Response.json({ id, name, company, phone, email, taxId, address }, { status: 201 })
}
