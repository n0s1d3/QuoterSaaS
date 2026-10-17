import { body, HttpError, text } from '../http.ts'
import { customerColumns } from '../db/customers.ts'
import { listQuery,listSearch } from '../db/list-query.ts'
export async function customers(request: Request, db: D1Database, org: string) {
  if (request.method === 'GET') {
    const url=new URL(request.url)
    if(url.searchParams.has('id')) {
      const id=text(url.searchParams.get('id'),'Customer',true,100)
      const customer=await db.prepare(`SELECT ${customerColumns} FROM customers WHERE organization_id=? AND id=?`).bind(org,id).first()
      if(!customer)throw new HttpError(404,'Cliente no encontrado')
      return Response.json(customer)
    }
    const {paged,limit,offset,search}=listQuery(url),conditions=['organization_id=?'],values:unknown[]=[org]
    if(search){const match=listSearch("(name || ' ' || COALESCE(company,'') || ' ' || COALESCE(email,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(tax_id,''))",search);conditions.push(match.sql);values.push(match.value)}
    const where=conditions.join(' AND '),count=db.prepare(`SELECT COUNT(*) AS total FROM customers WHERE ${where}`).bind(...values)
    if(paged){
      const rows=await db.batch([count,db.prepare(`SELECT ${customerColumns} FROM customers WHERE ${where} ORDER BY name COLLATE NOCASE,id LIMIT ? OFFSET ?`).bind(...values,limit,offset)])
      const items=rows[1].results,total=Number((rows[0].results[0] as {total:number}).total)
      return Response.json({items,total,hasMore:offset+items.length<total})
    }
    if(Number((await count.first<{total:number}>())!.total)>500)throw new HttpError(413,'Hay demasiados clientes. Usa búsqueda y paginación para consultar la lista.')
    const items=(await db.prepare(`SELECT ${customerColumns} FROM customers WHERE ${where} ORDER BY name COLLATE NOCASE,id LIMIT 501`).bind(...values).all()).results
    if(items.length>500)throw new HttpError(413,'Hay demasiados clientes. Usa búsqueda y paginación para consultar la lista.')
    return Response.json(items)
  }
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
