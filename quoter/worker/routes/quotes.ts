import { body, HttpError } from '../http'
import { getQuote, summaryColumns } from '../db/quotes'
import { createQuote } from '../services/quote-service'
export async function quotes(request: Request, db: D1Database, org: string, id?: string) {
  if (id) {
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed')
    return Response.json(await getQuote(db, org, id))
  }
  if (request.method === 'GET') return Response.json((await db.prepare(`SELECT ${summaryColumns} FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.organization_id = ? ORDER BY q.created_at DESC, q.quote_number DESC`).bind(org).all()).results)
  if (request.method === 'POST') return Response.json(await createQuote(db, org, await body(request)), { status: 201 })
  throw new HttpError(405, 'Method not allowed')
}
