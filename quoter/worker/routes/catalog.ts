import { body, HttpError, text } from '../http'
const columns = 'c.id,c.name,c.description,c.unit_price AS unitPrice,c.unit,c.category,c.duration,c.valid_until AS validUntil,c.reviewed_at AS reviewedAt,c.stale_after_days AS staleAfterDays,c.active'
export async function catalog(request: Request, db: D1Database, org: string, id?: string) {
  if (request.method === 'GET' && !id) return Response.json((await db.prepare(`SELECT ${columns}, COALESCE((SELECT SUM(i.quantity) FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE i.catalog_item_id=c.id AND q.organization_id=c.organization_id AND q.status='accepted' AND q.deleted_at IS NULL),0) AS soldQuantity FROM catalog_items c WHERE c.organization_id=? ORDER BY c.name`).bind(org).all()).results)
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
