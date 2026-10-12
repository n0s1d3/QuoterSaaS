import { body, HttpError } from '../http'
import { getQuote, summaryColumns } from '../db/quotes'
import { createQuote } from '../services/quote-service'
export async function quotes(request: Request, db: D1Database, org: string, id?: string) {
  if (id) {
    if (request.method === 'PATCH') {
      const data = await body(request)
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
  if (request.method === 'GET') return Response.json((await db.prepare(`SELECT ${summaryColumns}, (SELECT GROUP_CONCAT(description, ' · ') FROM (SELECT description FROM quote_items WHERE quote_id=q.id ORDER BY sort_order LIMIT 3)) AS preview, (SELECT COUNT(*) FROM quote_items WHERE quote_id=q.id) AS itemCount FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.organization_id = ? ORDER BY q.created_at DESC, q.quote_number DESC`).bind(org).all()).results)
  if (request.method === 'POST') return Response.json(await createQuote(db, org, await body(request)), { status: 201 })
  throw new HttpError(405, 'Method not allowed')
}
