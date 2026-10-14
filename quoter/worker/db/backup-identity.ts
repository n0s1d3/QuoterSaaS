import { resolveCustomers } from './customer-restore'
import type { BusinessBackup } from '../../src/lib/backup'
import { digest } from '../auth/session'
import { HttpError } from '../http'
/** Match identities only inside the active business; imported foreign identities are stable. */
export async function backupIdentity(db:D1Database,org:string,backup:BusinessBackup){
 const maps={customers:new Map<string,string>(),catalog:new Map<string,string>(),quotes:new Map<string,string>()}
 const existing={customers:new Map<string,Record<string,unknown>>(),catalog:new Map<string,Record<string,unknown>>(),quotes:new Map<string,Record<string,unknown>>()}
 let customerDuplicates=new Map<string,string>()
 for(const [key,table] of [['customers','customers'],['catalog','catalog_items'],['quotes','quotes']] as const){
  const ids=backup[key].map(row=>row.id as string)
  const own=(await db.prepare(`SELECT id FROM ${table} WHERE organization_id=? AND id IN (SELECT value FROM json_each(?))`).bind(org,JSON.stringify(ids)).all<{id:string}>()).results
  const ownIds=new Set(own.map(row=>row.id))
  await Promise.all(ids.map(async id=>maps[key].set(id,ownIds.has(id)?id:`restore-${await digest(`${org}:${table}:${id}`)}`)))
  if(key==='customers'){
   const ownRows=(await db.prepare('SELECT id,name,company,phone,email,tax_id,address,created_at FROM customers WHERE organization_id=?').bind(org).all<Record<string,unknown>>()).results
   const aliases=(await db.prepare('SELECT source_id,customer_id FROM backup_customer_aliases WHERE organization_id=? AND source_id IN (SELECT value FROM json_each(?))').bind(org,JSON.stringify(ids)).all<{source_id:string;customer_id:string}>()).results
   try{const resolved=resolveCustomers(backup.customers,ownRows,maps.customers,new Map(aliases.map(row=>[row.source_id,row.customer_id])));maps.customers=resolved.maps;customerDuplicates=resolved.duplicates}catch(e){throw new HttpError(400,(e as Error).message)}
  }
  if(key!=='customers'&&new Set(maps[key].values()).size!==ids.length)throw new HttpError(400,'Dos registros del respaldo apuntan al mismo registro de destino')
  const candidates=(await db.prepare(`SELECT id,organization_id${key==='quotes'?',quote_number':''} FROM ${table} WHERE id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify([...maps[key].values()])).all<Record<string,unknown>>()).results
  for(const row of candidates){if(row.organization_id!==org)throw new HttpError(409,'Un identificador de restauración está ocupado por otro negocio');existing[key].set(row.id as string,row)}
 }
 return {maps,existing,customerDuplicates,counts:Object.fromEntries((['customers','catalog','quotes'] as const).map(key=>[key,{updated:existing[key].size,created:new Set(maps[key].values()).size-existing[key].size}])) as Record<'customers'|'catalog'|'quotes',{updated:number;created:number}>}
}
