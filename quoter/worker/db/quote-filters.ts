import { HttpError } from '../http'
export function quoteFilters(url:URL,org:string,date:string){
 const clauses=['q.organization_id=?','q.deleted_at IS NULL'],values:unknown[]=[org]
 const search=(url.searchParams.get('search')||'').trim().slice(0,200).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
 if(search){let expression="(q.quote_number || ' ' || c.name)";for(const [letters,base] of [['áÁ','a'],['éÉ','e'],['íÍ','i'],['óÓ','o'],['úÚüÜ','u'],['ñÑ','n'],['çÇ','c']] )for(const letter of letters)expression=`replace(${expression},'${letter}','${base}')`;clauses.push(`lower(${expression}) LIKE ? ESCAPE '\\'`);values.push('%'+search.replace(/[\\%_]/g,'\\$&')+'%')}
 const status=url.searchParams.get('status')||'all'
 if(status!=='all'){if(!['draft','sent','accepted','rejected'].includes(status))throw new HttpError(400,'Estado inválido');clauses.push('q.status=?');values.push(status)}
 const from=url.searchParams.get('from'),to=url.searchParams.get('to')
 for(const [value,operator] of [[from,'>='],[to,'<=']])if(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new HttpError(400,'Fecha de filtro inválida');clauses.push(`q.issue_date ${operator} ?`);values.push(value)}
 if(from&&to&&from>to)throw new HttpError(400,'La fecha inicial no puede ser posterior a la final')
 if(url.searchParams.get('expired')==='true'){clauses.push("q.status IN ('draft','sent') AND q.expiry_date<?");values.push(date)}
 return {where:clauses.join(' AND '),values}
}
export function currentDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export const categoryColumn="(SELECT json_group_array(category) FROM (SELECT DISTINCT COALESCE(catalog.category,'Sin categoría') AS category FROM quote_items i LEFT JOIN catalog_items catalog ON catalog.id=i.catalog_item_id AND catalog.organization_id=q.organization_id WHERE i.quote_id=q.id)) AS categoriesJson"
export function summaries(rows:Record<string,unknown>[]){return rows.map(({categoriesJson,...row})=>({...row,categories:JSON.parse(categoriesJson as string||'[]')}))}
