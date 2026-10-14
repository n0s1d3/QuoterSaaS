import { captureBranding } from '../db/branding'
import { body, HttpError } from '../http'
import { getQuote, summaryColumns } from '../db/quotes'
import { createQuote } from '../services/quote-service'
export async function quotes(request: Request, db: D1Database, org: string, id?: string, duplicate=false) {
  if(id&&duplicate){
    if(request.method!=='POST')throw new HttpError(405,'Method not allowed')
    const source=await getQuote(db,org,id)
    const issueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
    return Response.json(await createQuote(db,org,{...source,customerId:source.customerId,issueDate,expiryDate:null}),{status:201})
  }
  if (id) {
    if (request.method === 'PUT') return Response.json(await createQuote(db, org, await body(request), id))
    if (request.method === 'PATCH') {
      const data = await body(request)
      if (data.refreshBranding === true) {
        const result = await captureBranding(db, org, id).run()
        if (!result.meta.changes) throw new HttpError(404, 'Quote not found')
        return Response.json(await getQuote(db, org, id))
      }
      if (!['draft', 'sent', 'accepted', 'rejected'].includes(data.status as string)) throw new HttpError(400, 'Invalid status')
      const result = await db.prepare('UPDATE quotes SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?').bind(data.status, id, org).run()
      if (!result.meta.changes) throw new HttpError(404, 'Quote not found')
      return Response.json(await getQuote(db, org, id))
    }
    if (request.method === 'DELETE') {
      const result = await db.prepare('DELETE FROM quotes WHERE id=? AND organization_id=?').bind(id, org).run()
      if (!result.meta.changes) throw new HttpError(404, 'Quote not found')
      return Response.json({ deleted: true })
    }
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed')
    return Response.json(await getQuote(db, org, id))
  }
  if (request.method === 'GET') {
    const rows = (await db.prepare(`SELECT ${summaryColumns}, q.notes,
      (SELECT json_group_array(category) FROM (
        SELECT DISTINCT COALESCE(catalog.category, 'Sin categoría') AS category
        FROM quote_items i LEFT JOIN catalog_items catalog ON catalog.id=i.catalog_item_id AND catalog.organization_id=q.organization_id
        WHERE i.quote_id=q.id
      )) AS categoriesJson
      FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.organization_id = ? ORDER BY q.created_at DESC, q.quote_number DESC`).bind(org).all<{categoriesJson:string}>()).results
    return Response.json(rows.map(({categoriesJson,...row}) => ({...row,categories:JSON.parse(categoriesJson)})))
  }
  if (request.method === 'POST') return Response.json(await createQuote(db, org, await body(request)), { status: 201 })
  throw new HttpError(405, 'Method not allowed')
}
