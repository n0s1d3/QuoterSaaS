import { dashboardMetrics } from '../../src/lib/dashboard'
import { categoryColumn,currentDate,quoteFilters,summaries } from '../db/quote-filters'
import { summaryColumns } from '../db/quotes'
import { HttpError } from '../http'
export async function dashboard(request:Request,db:D1Database,org:string){
 if(request.method!=='GET')throw new HttpError(405,'Operación no válida')
 const date=currentDate(),{where,values}=quoteFilters(new URL(request.url),org,date)
 const join='FROM quotes q JOIN customers c ON c.id=q.customer_id'
 const base=dashboardMetrics([],date),first=base.months[0].key+'-01',last=new Date(date.slice(0,7)+'-01T00:00:00Z');last.setUTCMonth(last.getUTCMonth()+1)
 const upcoming=new Date(Date.parse(date)+7*86400000).toISOString().slice(0,10)
 const result=await db.batch<Record<string,unknown>>([
  db.prepare(`SELECT COUNT(*) AS quoteCount,SUM(q.status='accepted') AS acceptedCount,COALESCE(SUM(CASE WHEN q.status='accepted' THEN q.total ELSE 0 END),0) AS acceptedTotal,COALESCE(SUM(CASE WHEN q.status IN ('draft','sent') AND (q.expiry_date IS NULL OR q.expiry_date>=?) THEN q.total ELSE 0 END),0) AS potentialTotal,SUM(q.status IN ('draft','sent') AND (q.expiry_date IS NULL OR q.expiry_date>=?)) AS potentialCount,SUM(q.status='draft') AS draftsCount,SUM(q.status='sent') AS sentCount,SUM(q.status='rejected') AS rejectedCount,SUM(q.status IN ('draft','sent') AND q.expiry_date<?) AS expiredCount,SUM(q.status IN ('draft','sent') AND q.expiry_date>=? AND q.expiry_date<=?) AS upcomingCount ${join} WHERE ${where}`).bind(date,date,date,date,upcoming,...values),
  db.prepare(`SELECT substr(q.issue_date,1,7) AS month,COALESCE(SUM(CASE WHEN q.status='accepted' THEN q.total ELSE 0 END),0) AS accepted,COALESCE(SUM(CASE WHEN q.status IN ('draft','sent') AND (q.expiry_date IS NULL OR q.expiry_date>=?) THEN q.total ELSE 0 END),0) AS potential ${join} WHERE ${where} AND q.issue_date>=? AND q.issue_date<? GROUP BY month`).bind(date,...values,first,last.toISOString().slice(0,10)),
  db.prepare(`SELECT COALESCE(cat.category,'Sin categoría') AS name,COUNT(DISTINCT q.id) AS count ${join} JOIN quote_items i ON i.quote_id=q.id LEFT JOIN catalog_items cat ON cat.id=i.catalog_item_id AND cat.organization_id=q.organization_id WHERE ${where} GROUP BY 1 ORDER BY count DESC,1`).bind(...values),
  db.prepare(`SELECT ${summaryColumns},q.notes,${categoryColumn} ${join} WHERE ${where} ORDER BY q.created_at DESC,CAST(substr(q.quote_number,3) AS INTEGER) DESC,q.id DESC LIMIT 6`).bind(...values),
  db.prepare(`SELECT ${summaryColumns} ${join} WHERE ${where} AND q.status IN ('draft','sent') AND q.expiry_date<=? ORDER BY q.expiry_date,q.id LIMIT 4`).bind(...values,upcoming),
  db.prepare(`SELECT ${summaryColumns} ${join} WHERE ${where} AND q.status='draft' ORDER BY q.created_at,q.id LIMIT 1`).bind(...values),
 ])
 const counts=result[0].results[0]
 return Response.json({quoteCount:Number(counts.quoteCount),statusCounts:{draft:Number(counts.draftsCount)||0,sent:Number(counts.sentCount)||0,accepted:Number(counts.acceptedCount)||0,rejected:Number(counts.rejectedCount)||0},recent:summaries(result[3].results),metrics:{...base,acceptedTotal:Number(counts.acceptedTotal),potentialTotal:Number(counts.potentialTotal),potentialCount:Number(counts.potentialCount)||0,acceptedCount:Number(counts.acceptedCount)||0,expiredCount:Number(counts.expiredCount)||0,upcomingCount:Number(counts.upcomingCount)||0,draftsCount:Number(counts.draftsCount)||0,months:base.months.map(month=>({...month,...result[1].results.find(row=>row.month===month.key)})),categories:result[2].results,expired:result[4].results.filter(q=>String(q.expiryDate)<date),upcoming:result[4].results.filter(q=>String(q.expiryDate)>=date),drafts:result[5].results}})
}
