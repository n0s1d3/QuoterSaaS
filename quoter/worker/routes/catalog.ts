import { body, HttpError, text } from '../http.ts'
import { listQuery,listSearch } from '../db/list-query.ts'
const columns = 'c.id,c.name,c.description,c.unit_price AS unitPrice,c.unit,c.category,c.duration,c.valid_until AS validUntil,c.reviewed_at AS reviewedAt,c.stale_after_days AS staleAfterDays,c.active'
export async function catalog(request: Request, db: D1Database, org: string, id?: string) {
  if (request.method === 'GET' && !id) {
    const url=new URL(request.url),{paged,limit,offset,search}=listQuery(url),conditions=['c.organization_id=?'],values:unknown[]=[org]
    const active=url.searchParams.get('active')||'all',order=url.searchParams.get('order')||'name'
    if(!['all','1','0'].includes(active)||!['name','sales'].includes(order))throw new HttpError(400,'Filtro de catálogo inválido')
    if(active!=='all'){conditions.push('c.active=?');values.push(Number(active))}
    if(search){const match=listSearch("(c.name || ' ' || c.category || ' ' || COALESCE(c.description,''))",search);conditions.push(match.sql);values.push(match.value)}
    const where=conditions.join(' AND '),count=db.prepare(`SELECT COUNT(*) AS total FROM catalog_items c WHERE ${where}`).bind(...values)
    const sold="COALESCE((SELECT SUM(i.quantity) FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE i.catalog_item_id=c.id AND q.organization_id=c.organization_id AND q.status='accepted' AND q.deleted_at IS NULL),0) AS soldQuantity"
    const ordering=(order==='sales'?'soldQuantity DESC,':'')+'c.name COLLATE NOCASE,c.id'
    if(paged){
      const rows=await db.batch([count,db.prepare(`SELECT ${columns},${sold} FROM catalog_items c WHERE ${where} ORDER BY ${ordering} LIMIT ? OFFSET ?`).bind(...values,limit,offset)])
      const items=rows[1].results,total=Number((rows[0].results[0] as {total:number}).total)
      return Response.json({items,total,hasMore:offset+items.length<total})
    }
    if(Number((await count.first<{total:number}>())!.total)>500)throw new HttpError(413,'Hay demasiadas partidas. Usa búsqueda y paginación para consultar el catálogo.')
    const items=(await db.prepare(`SELECT ${columns},${sold} FROM catalog_items c WHERE ${where} ORDER BY ${ordering} LIMIT 501`).bind(...values).all()).results
    if(items.length>500)throw new HttpError(413,'Hay demasiadas partidas. Usa búsqueda y paginación para consultar el catálogo.')
    return Response.json(items)
  }
  if (id) {
    if (!await db.prepare('SELECT id FROM catalog_items WHERE id=? AND organization_id=?').bind(id,org).first()) throw new HttpError(404,'Partida no encontrada')
    if (request.method === 'DELETE') { await db.prepare('UPDATE catalog_items SET active=0 WHERE id=? AND organization_id=?').bind(id,org).run(); return Response.json({archived:true}) }
  }
  if ((!id && request.method !== 'POST') || (id && request.method !== 'PUT')) throw new HttpError(405,'Operación no permitida')
  const data=await body(request)
  const name=text(data.name,'Name',true,200), description=text(data.description,'Description',false,1500)
  const category=text(data.category,'Type',true,100), unit=text(data.unit,'Unit',true,50), duration=text(data.duration,'Duration',false,200)
  const validUntil=text(data.validUntil,'Validity',false,10)
  if (validUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(Date.parse(validUntil)) || new Date(validUntil).toISOString().slice(0,10)!==validUntil)) throw new HttpError(400,'Fecha de vigencia inválida')
  if (!Number.isSafeInteger(data.unitPrice) || (data.unitPrice as number)<0 || !Number.isInteger(data.staleAfterDays) || (data.staleAfterDays as number)<1 || (data.staleAfterDays as number)>3650) throw new HttpError(400,'Precio o intervalo de revisión inválido')
  const reviewedAt = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const itemId=id || crypto.randomUUID()
  if (id) await db.prepare('UPDATE catalog_items SET name=?,description=?,category=?,unit=?,duration=?,valid_until=?,unit_price=?,stale_after_days=?,reviewed_at=?,active=? WHERE id=? AND organization_id=?').bind(name,description,category,unit,duration,validUntil,data.unitPrice,data.staleAfterDays,reviewedAt,data.active===false?0:1,itemId,org).run()
  else await db.prepare('INSERT INTO catalog_items (id,organization_id,name,description,category,unit,duration,valid_until,unit_price,stale_after_days,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(itemId,org,name,description,category,unit,duration,validUntil,data.unitPrice,data.staleAfterDays,reviewedAt).run()
  return Response.json(await db.prepare(`SELECT ${columns} FROM catalog_items c WHERE c.id=? AND c.organization_id=?`).bind(itemId,org).first(),{status:id?200:201})
}
