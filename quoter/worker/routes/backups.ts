import { inspectLogo,validateRaster } from '../../src/lib/raster'
import { backupIdentity } from '../db/backup-identity'
import { backupLimit, quotesCsv, validateBackup } from '../../src/lib/backup'
import { digest, randomToken, type Account } from '../auth/session'
import { limit } from '../auth/rate-limit'
import { auditStatement } from '../db/audit'
import { boundedText,HttpError } from '../http'
const profileColumns='name,currency,logo,primary_color AS primaryColor,accent_color AS accentColor,tax_id AS taxId,address,phone,contact_email AS contactEmail,payment_terms AS paymentTerms'
export async function backups(request:Request,db:D1Database,user:Account,path:string) {
 if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede administrar respaldos')
 const org=user.organizationId
 if(path==='/api/backups/export'&&request.method==='GET'){
  if(new URL(request.url).searchParams.get('format')==='csv'){
   const rows=(await db.prepare('SELECT q.*,c.name AS customer_name FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=? ORDER BY q.created_at,q.id').bind(org).all<Record<string,unknown>>()).results
   await auditStatement(db,user,'backup.exported',null,{format:'csv'}).run()
   return new Response(quotesCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="cotizaciones.csv"'}})
  }
  const tables=await db.batch<Record<string,unknown>>([db.prepare(`SELECT ${profileColumns} FROM organizations WHERE id=?`).bind(org),db.prepare('SELECT * FROM customers WHERE organization_id=? ORDER BY id').bind(org),db.prepare('SELECT * FROM catalog_items WHERE organization_id=? ORDER BY id').bind(org),db.prepare('SELECT * FROM quotes WHERE organization_id=? ORDER BY created_at,id').bind(org),db.prepare('SELECT i.* FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.organization_id=? ORDER BY i.quote_id,i.sort_order').bind(org)])
  if(tables.slice(1).reduce((sum,table)=>sum+table.results.length,0)>2000)throw new HttpError(413,'El respaldo supera 2000 registros. Exporta CSV y solicita un respaldo de la base de datos para grandes volúmenes.')
  const strip=(rows:Record<string,unknown>[])=>rows.map(row=>{const copy={...row};delete copy.organization_id;delete copy.write_token;delete copy.revision;return copy})
  const content=JSON.stringify({format:'quoter-business-backup',version:1,exportedAt:new Date().toISOString(),business:tables[0].results[0],customers:strip(tables[1].results),catalog:strip(tables[2].results),quotes:strip(tables[3].results),items:tables[4].results})
  if(new TextEncoder().encode(content).length>backupLimit)throw new HttpError(413,'El respaldo supera 8 MB. Exporta CSV y solicita un respaldo de la base de datos antes de restaurar grandes volúmenes.')
  await auditStatement(db,user,'backup.exported',null,{format:'json'}).run()
  return new Response(content,{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="quoter-respaldo.json"'}})
 }
 if(!['/api/backups/preview','/api/backups/restore'].includes(path)||request.method!=='POST')throw new HttpError(405,'Operación de respaldo no válida')
 await limit(db,`backup:${user.id}`,30)
 if(Number(request.headers.get('Content-Length')||0)>backupLimit*1.1)throw new HttpError(413,'El archivo supera el límite de 8 MB')
 const raw=await boundedText(request,backupLimit+4096)
 if(new TextEncoder().encode(raw).length>backupLimit+4096)throw new HttpError(413,'El archivo supera el límite de 8 MB')
 let envelope:Record<string,unknown>,backup
 try{envelope=JSON.parse(raw);backup=validateBackup(envelope.backup)
 const logos=new Set<string>();if(backup.business.logo)logos.add(backup.business.logo as string);for(const quote of backup.quotes){if(quote.branding_snapshot){const brand=JSON.parse(quote.branding_snapshot as string);if(brand.logo)logos.add(brand.logo)}}
 let pixels=0;for(const logo of logos){const info=inspectLogo(logo);pixels+=info.width*info.height;if(pixels>16777216)throw new Error('El respaldo supera el límite de píxeles de logos distintos');await validateRaster(info)}}catch(e){throw new HttpError(400,e instanceof Error?e.message:'Respaldo inválido')}
 if(backup.customers.length+backup.catalog.length+backup.quotes.length+backup.items.length>2000)throw new HttpError(400,'La restauración admite hasta 2000 registros por archivo')
 const hash=await digest(JSON.stringify({mode:'overwrite-v3-customers',backup}))
 const identity=await backupIdentity(db,org,backup)
 if(path.endsWith('/preview')){
  const token=randomToken()
  await db.prepare('DELETE FROM backup_restores WHERE completed_at IS NULL AND expires_at<=?').bind(Math.floor(Date.now()/1000)).run()
  await db.prepare('INSERT INTO backup_restores(id,organization_id,user_id,token_hash,content_hash,expires_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),org,user.id,await digest(token),hash,Math.floor(Date.now()/1000)+900).run()
  return Response.json({token,businessName:backup.business.name,exportedAt:backup.exportedAt,customers:backup.customers.length,catalog:backup.catalog.length,quotes:backup.quotes.length,items:backup.items.length,trashed:backup.quotes.filter(q=>q.deleted_at).length,changes:identity.counts,customersMerged:identity.customerDuplicates.size})
 }
 if(envelope.confirm!==true||typeof envelope.token!=='string')throw new HttpError(400,'Revisa y confirma la restauración primero')
 const preview=await db.prepare('SELECT id FROM backup_restores WHERE organization_id=? AND user_id=? AND token_hash=? AND content_hash=? AND completed_at IS NULL AND expires_at>?').bind(org,user.id,await digest(envelope.token),hash,Math.floor(Date.now()/1000)).first<{id:string}>()
 if(!preview)throw new HttpError(400,'La revisión venció, cambió el archivo o ya se utilizó. Revisa nuevamente.')
 const operation=crypto.randomUUID(),gate='EXISTS (SELECT 1 FROM backup_restores WHERE id=? AND consumption_id=?)',gateValues=[preview.id,operation]
 const statements=[db.prepare('UPDATE backup_restores SET completed_at=CURRENT_TIMESTAMP,consumption_id=? WHERE id=? AND completed_at IS NULL AND expires_at>?').bind(operation,preview.id,Math.floor(Date.now()/1000))]
 const {maps,existing}=identity
 const newQuotes=backup.quotes.filter(row=>!existing.quotes.has(maps.quotes.get(row.id as string)!))
 const newPositions=new Map(newQuotes.map((row,index)=>[row.id as string,index+1]))
 // JSON row batches keep the number of D1 queries low and bind all imported data.
 const bulk=(table:string,columns:string[],rows:Record<string,unknown>[],quoteNumbers=false)=>{
  let chunk:Record<string,unknown>[]=[];let bytes=0
  const flush=()=>{if(!chunk.length)return;const expressions=columns.map(key=>`json_extract(e.value,'$.${key}')`);if(quoteNumbers)expressions.push(`COALESCE((SELECT q.quote_number FROM quotes q WHERE q.id=json_extract(e.value,'$.id') AND q.organization_id=json_extract(e.value,'$.organization_id')),(SELECT printf('Q-%04d',s.value-${newQuotes.length}+json_extract(e.value,'$.__index')) FROM quote_sequences s WHERE s.organization_id=json_extract(e.value,'$.organization_id')))`);const update=table==='customers'||table==='catalog_items'||table==='quotes';const fields=columns.filter(key=>!['id','organization_id'].includes(key));let conflict=update?` ON CONFLICT(id) DO UPDATE SET ${fields.map(key=>`${key}=excluded.${key}`).join(',')} WHERE ${table}.organization_id=excluded.organization_id`:'';if(table==='backup_customer_aliases')conflict=' ON CONFLICT(organization_id,source_id) DO UPDATE SET customer_id=excluded.customer_id';if(table==='quotes')conflict=conflict.replace(' WHERE ', ',revision=quotes.revision+1,updated_at=CURRENT_TIMESTAMP WHERE ');statements.push(db.prepare(`INSERT INTO ${table} (${[...columns,...(quoteNumbers?['quote_number']:[])].join(',')}) SELECT ${expressions.join(',')} FROM json_each(?) e WHERE ${gate}${conflict}`).bind(JSON.stringify(chunk),...gateValues));chunk=[];bytes=0}

  for(const row of rows){const length=new TextEncoder().encode(JSON.stringify(row)).length;if(chunk.length>=100||bytes+length>800000)flush();chunk.push(row);bytes+=length}flush()
 }
 bulk('customers',['id','organization_id','name','company','phone','email','tax_id','address'],backup.customers.map(row=>({...row,id:maps.customers.get(row.id as string),organization_id:org})))
 const customerAliases=[...maps.customers,...identity.customerDuplicates].map(([source,target])=>({organization_id:org,source_id:source,customer_id:target}))
 if(identity.customerDuplicates.size){
  const duplicates=JSON.stringify([...identity.customerDuplicates].map(([source,target])=>({source,target})))
  const replacement="(SELECT json_extract(e.value,'$.target') FROM json_each(?) e WHERE json_extract(e.value,'$.source')=customer_id)",sources="SELECT json_extract(e.value,'$.source') FROM json_each(?) e"
  statements.push(db.prepare(`UPDATE quotes SET customer_id=${replacement} WHERE organization_id=? AND customer_id IN (${sources}) AND ${gate}`).bind(duplicates,org,duplicates,...gateValues))
  statements.push(db.prepare(`UPDATE backup_customer_aliases SET customer_id=${replacement} WHERE organization_id=? AND customer_id IN (${sources}) AND ${gate}`).bind(duplicates,org,duplicates,...gateValues))
  statements.push(db.prepare(`DELETE FROM customers WHERE organization_id=? AND id IN (${sources}) AND ${gate}`).bind(org,duplicates,...gateValues))
 }
 bulk('backup_customer_aliases',['organization_id','source_id','customer_id'],customerAliases)
 bulk('catalog_items',['id','organization_id','name','description','unit_price','unit','category','duration','valid_until','reviewed_at','stale_after_days','active'],backup.catalog.slice().sort((a,b)=>Number(a.active)-Number(b.active)).map(row=>({...row,id:maps.catalog.get(row.id as string),organization_id:org})))
 if(newQuotes.length)statements.push(db.prepare(`INSERT INTO quote_sequences(organization_id,value) SELECT ?,? WHERE ${gate} ON CONFLICT(organization_id) DO UPDATE SET value=value+excluded.value`).bind(org,newQuotes.length,...gateValues))
 bulk('quotes',['id','organization_id','customer_id','status','issue_date','expiry_date','subtotal','discount','tax','total','notes','payment_terms','surcharge_type','surcharge_value','surcharge','branding_snapshot','branding_captured_at','deleted_at','write_token'],backup.quotes.slice().sort((a,b)=>Number(!a.deleted_at)-Number(!b.deleted_at)).map(row=>({...row,id:maps.quotes.get(row.id as string),organization_id:org,customer_id:maps.customers.get(row.customer_id as string),write_token:operation,__index:newPositions.get(row.id as string)||0})),true)
 statements.push(db.prepare(`DELETE FROM quote_items WHERE quote_id IN (SELECT q.id FROM quotes q WHERE q.organization_id=? AND q.write_token=?) AND ${gate}`).bind(org,operation,...gateValues))
 bulk('quote_items',['id','quote_id','description','quantity','unit_price','tax_rate','line_subtotal','line_tax','line_total','sort_order','catalog_item_id','unit','duration','valid_until'],backup.items.map(row=>({...row,id:crypto.randomUUID(),quote_id:maps.quotes.get(row.quote_id as string),catalog_item_id:row.catalog_item_id?maps.catalog.get(row.catalog_item_id as string):null})))
 bulk('audit_events',['id','organization_id','quote_id','action','actor_user_id','actor_email','detail'],backup.quotes.map(row=>({id:crypto.randomUUID(),organization_id:org,quote_id:maps.quotes.get(row.id as string),action:existing.quotes.has(maps.quotes.get(row.id as string)!)?'quote.backup.updated':'quote.imported',actor_user_id:user.id,actor_email:user.email,detail:JSON.stringify({originalNumber:row.quote_number})})))
 if(envelope.updateProfile===true)statements.push(db.prepare(`UPDATE organizations SET name=?,logo=?,primary_color=?,accent_color=?,tax_id=?,address=?,phone=?,contact_email=?,payment_terms=? WHERE id=? AND ${gate}`).bind(...['name','logo','primaryColor','accentColor','taxId','address','phone','contactEmail','paymentTerms'].map(k=>backup.business[k]??null),org,...gateValues))
 statements.push(auditStatement(db,user,'backup.restored',null,{customers:backup.customers.length,catalog:backup.catalog.length,quotes:backup.quotes.length,updateProfile:envelope.updateProfile===true,changes:identity.counts,customersMerged:identity.customerDuplicates.size},{sql:gate,values:gateValues}))
 const result=await db.batch(statements)
 if(!result[0].meta.changes)throw new HttpError(409,'Este respaldo ya fue aplicado o su revisión venció')
 return Response.json({restored:true,quotes:backup.quotes.length,changes:identity.counts,customersMerged:identity.customerDuplicates.size})
}
