import { categoryColumn,currentDate,quoteFilters,summaries } from '../db/quote-filters'
import type { Account } from '../auth/session'
import { auditStatement } from '../db/audit'
import { captureBranding } from '../db/branding'
import { body, HttpError } from '../http'
import { getQuote, summaryColumns } from '../db/quotes'
import { createQuote } from '../services/quote-service'
export async function quotes(request: Request, db: D1Database, org: string, id?: string, duplicate=false, actor?:Account) {
  if(id&&duplicate){
    if(request.method!=='POST')throw new HttpError(405,'Operación no permitida')
    const source=await getQuote(db,org,id)
    const issueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
    return Response.json(await createQuote(db,org,{...source,customerId:source.customerId,issueDate,expiryDate:null},undefined,actor),{status:201})
  }
  if (id) {
    if (request.method === 'PUT') return Response.json(await createQuote(db, org, await body(request), id,actor))
    if (request.method === 'PATCH') {
      const data = await body(request)
      if (data.refreshBranding === true) {
        await getQuote(db,org,id)
        const result = (await db.batch([captureBranding(db,org,id),...(actor?[auditStatement(db,actor,'quote.brand.updated',id,{}, {sql:'EXISTS (SELECT 1 FROM quotes WHERE id=? AND organization_id=? AND deleted_at IS NULL)',values:[id,org]})]:[])]))[0]
        if (!result.meta.changes) throw new HttpError(404, 'Cotización no encontrada')
        return Response.json(await getQuote(db, org, id))
      }
      if (!['draft', 'sent', 'accepted', 'rejected'].includes(data.status as string)) throw new HttpError(400, 'Estado inválido')
      await getQuote(db,org,id)
      const operation=crypto.randomUUID()
      const result = (await db.batch([db.prepare('UPDATE quotes SET status=?, updated_at=CURRENT_TIMESTAMP,revision=revision+1,write_token=? WHERE id=? AND organization_id=? AND deleted_at IS NULL').bind(data.status,operation,id,org),...(actor?[auditStatement(db,actor,'quote.status.changed',id,{status:data.status},{sql:'EXISTS (SELECT 1 FROM quotes WHERE id=? AND write_token=?)',values:[id,operation]})]:[])]))[0]
      if (!result.meta.changes) throw new HttpError(404, 'Cotización no encontrada')
      return Response.json(await getQuote(db, org, id))
    }
    if (request.method === 'DELETE') {
      const operation=crypto.randomUUID()
      const result = (await db.batch([db.prepare('UPDATE quotes SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,revision=revision+1,write_token=? WHERE id=? AND organization_id=? AND deleted_at IS NULL').bind(operation,id,org),...(actor?[auditStatement(db,actor,'quote.trashed',id,{}, {sql:'EXISTS (SELECT 1 FROM quotes WHERE id=? AND write_token=?)',values:[id,operation]})]:[])]))[0]
      if (!result.meta.changes) throw new HttpError(404, 'Cotización no encontrada')
      return Response.json({ deleted: true })
    }
    if (request.method !== 'GET') throw new HttpError(405, 'Operación no permitida')
    return Response.json(await getQuote(db, org, id))
  }
  if (request.method === 'GET') {
    const url=new URL(request.url)
    if(url.searchParams.get('paged')==='true'){
      const page=Number(url.searchParams.get('page')||1),size=Number(url.searchParams.get('size')||12)
      if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(size)||size<1||size>50)throw new HttpError(400,'Página inválida')
      const {where,values}=quoteFilters(url,org,currentDate())
      const result=await db.batch<Record<string,unknown>>([db.prepare(`SELECT COUNT(*) AS total FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE ${where}`).bind(...values),db.prepare(`SELECT ${summaryColumns},q.notes,${categoryColumn} FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE ${where} ORDER BY q.created_at DESC,CAST(substr(q.quote_number,3) AS INTEGER) DESC,q.id DESC LIMIT ? OFFSET ?`).bind(...values,size,(page-1)*size)])
      return Response.json({quotes:summaries(result[1].results),total:Number(result[0].results[0].total),page,size})
    }
    const rows = (await db.prepare(`SELECT ${summaryColumns}, q.notes,
      (SELECT json_group_array(category) FROM (
        SELECT DISTINCT COALESCE(catalog.category, 'Sin categoría') AS category
        FROM quote_items i LEFT JOIN catalog_items catalog ON catalog.id=i.catalog_item_id AND catalog.organization_id=q.organization_id
        WHERE i.quote_id=q.id
      )) AS categoriesJson
      FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.organization_id = ? AND q.deleted_at IS NULL ORDER BY q.created_at DESC, q.quote_number DESC`).bind(org).all<{categoriesJson:string}>()).results
    return Response.json(rows.map(({categoriesJson,...row}) => ({...row,categories:JSON.parse(categoriesJson)})))
  }
  if (request.method === 'POST') return Response.json(await createQuote(db, org, await body(request),undefined,actor), { status: 201 })
  throw new HttpError(405, 'Operación no permitida')
}
