import { inspectLogo,validateRaster } from '../../src/lib/raster'
import { backupIdentity } from '../db/backup-identity'
import { backupLimit,backupRecordLimit, quotesCsv, validateBackup } from '../../src/lib/backup'
import { digest, randomToken, type Account } from '../auth/session'
import { limit } from '../auth/rate-limit'
import { auditStatement } from '../db/audit'
import { boundedText,HttpError } from '../http'
const profileColumns='quote_template AS quoteTemplate,name,currency,logo,primary_color AS primaryColor,accent_color AS accentColor,tax_id AS taxId,address,phone,contact_email AS contactEmail,payment_terms AS paymentTerms'
export async function backups(request:Request,db:D1Database,user:Account,path:string) {
 if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede administrar respaldos')
 const org=user.organizationId
 if(path==='/api/backups/export'&&request.method==='GET'){
  if(new URL(request.url).searchParams.get('format')==='csv'){
   const size=await db.prepare("SELECT COUNT(*) AS records,COALESCE(SUM(length(CAST(COALESCE(q.notes,'') AS BLOB))+length(CAST(c.name AS BLOB))+512),0) AS bytes FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=?").bind(org).first<{records:number;bytes:number}>()
   if(!size||size.records>10000||size.bytes>backupLimit)throw new HttpError(413,'El CSV supera 10000 cotizaciones u 8 MB. Solicita un respaldo de la base de datos.')
   const rows=(await db.prepare('SELECT q.quote_number,q.status,q.issue_date,q.expiry_date,q.subtotal,q.tax,q.discount,q.surcharge,q.total,q.notes,q.deleted_at,c.name AS customer_name FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=? ORDER BY q.created_at,q.id').bind(org).all<Record<string,unknown>>()).results
   const csv=quotesCsv(rows);if(new TextEncoder().encode(csv).length>backupLimit)throw new HttpError(413,'El CSV supera 8 MB. Solicita un respaldo de la base de datos.')
   await auditStatement(db,user,'backup.exported',null,{format:'csv'}).run()
   return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="cotizaciones.csv"'}})
  }
  const count=await db.prepare('SELECT (SELECT COUNT(*) FROM customers WHERE organization_id=?)+(SELECT COUNT(*) FROM catalog_items WHERE organization_id=?)+(SELECT COUNT(*) FROM quotes WHERE organization_id=?)+(SELECT COUNT(*) FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.organization_id=?) AS records').bind(org,org,org,org).first<{records:number}>()
  if(!count||count.records>backupRecordLimit)throw new HttpError(413,'El respaldo supera 2000 registros. Solicita un respaldo de la base de datos para grandes volúmenes.')
  // Deduplicate in D1 before materializing any image in the Worker. A hundred
  // snapshots sharing one logo do not require a hundred large response values.
  const cte="WITH logo_values AS (SELECT logo FROM organizations WHERE id=? AND logo IS NOT NULL AND logo<>'' UNION SELECT json_extract(branding_snapshot,'$.logo') FROM quotes WHERE organization_id=? AND branding_snapshot IS NOT NULL AND json_extract(branding_snapshot,'$.logo') IS NOT NULL AND json_extract(branding_snapshot,'$.logo')<>''), logos AS (SELECT logo,'logo-'||ROW_NUMBER() OVER (ORDER BY logo) AS logo_id FROM logo_values) "
  const quoteFields=['id','customer_id','quote_number','status','issue_date','expiry_date','subtotal','discount','tax','total','notes','created_at','updated_at','payment_terms','surcharge_type','surcharge_value','surcharge','branding_captured_at','deleted_at']
  const brand="CASE WHEN q.branding_snapshot IS NULL THEN NULL ELSE json_set(q.branding_snapshot,'$.logo',(SELECT logo_id FROM logos WHERE logo=json_extract(q.branding_snapshot,'$.logo'))) END"
  const size=await db.prepare(cte+"SELECT COALESCE((SELECT SUM(length(CAST(logo AS BLOB))) FROM logos),0)+COALESCE((SELECT SUM(length(CAST(COALESCE(notes,'') AS BLOB))+length(CAST(COALESCE(payment_terms,'') AS BLOB))+length(CAST(COALESCE("+brand+",'') AS BLOB))) FROM quotes q WHERE organization_id=?),0) AS bytes").bind(org,org,org).first<{bytes:number}>()
  if(!size||size.bytes>backupLimit)throw new HttpError(413,'El respaldo supera 8 MB. Solicita un respaldo de la base de datos.')
  const tables=await db.batch<Record<string,unknown>>([db.prepare(`SELECT ${profileColumns} FROM organizations WHERE id=?`).bind(org),db.prepare('SELECT * FROM customers WHERE organization_id=? ORDER BY id').bind(org),db.prepare('SELECT * FROM catalog_items WHERE organization_id=? ORDER BY id').bind(org),db.prepare(cte+`SELECT ${quoteFields.map(key=>'q.'+key).join(',')},${brand} AS branding_snapshot FROM quotes q WHERE q.organization_id=? ORDER BY q.created_at,q.id`).bind(org,org,org),db.prepare('SELECT i.* FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.organization_id=? ORDER BY i.quote_id,i.sort_order').bind(org),db.prepare(cte+'SELECT logo_id,logo FROM logos ORDER BY logo_id').bind(org,org)])
  const images=Object.fromEntries(tables[5].results.map(row=>[row.logo_id,row.logo]));const business=tables[0].results[0];business.logo=tables[5].results.find(row=>row.logo===business.logo)?.logo_id??null
  const backup=validateBackup({format:'quoter-business-backup',version:2,images,exportedAt:new Date().toISOString(),business,customers:tables[1].results,catalog:tables[2].results,quotes:tables[3].results,items:tables[4].results})
  const content=JSON.stringify(backup)
  if(new TextEncoder().encode(content).length>backupLimit)throw new HttpError(413,'El respaldo supera 8 MB. Solicita un respaldo de la base de datos.')
  await auditStatement(db,user,'backup.exported',null,{format:'json'}).run()
  return new Response(content,{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="quoter-respaldo.json"'}})
 }
 if(!['/api/backups/preview','/api/backups/restore'].includes(path)||request.method!=='POST')throw new HttpError(405,'Operación de respaldo no válida')
 await limit(db,`backup:${user.id}`,300)
 if(Number(request.headers.get('Content-Length')||0)>backupLimit*1.1)throw new HttpError(413,'El archivo supera el límite de 8 MB')
 const raw=await boundedText(request,backupLimit+4096)
 if(new TextEncoder().encode(raw).length>backupLimit+4096)throw new HttpError(413,'El archivo supera el límite de 8 MB')
 let envelope:Record<string,unknown>,backup
 try{envelope=JSON.parse(raw);backup=validateBackup(envelope.backup)}catch(e){throw new HttpError(400,e instanceof Error?e.message:'Respaldo inválido')}
 const hash=await digest(JSON.stringify({mode:'overwrite-v4-images',backup}))
 const now=Math.floor(Date.now()/1000)
 if(path.endsWith('/preview')){
  const token=typeof envelope.token==='string'?envelope.token:randomToken()
  let review=typeof envelope.token==='string'?await db.prepare('SELECT id,validation_cursor,validation_ready FROM backup_restores WHERE organization_id=? AND user_id=? AND token_hash=? AND content_hash=? AND completed_at IS NULL AND expires_at>?').bind(org,user.id,await digest(token),hash,now).first<{id:string;validation_cursor:number;validation_ready:number}>():null
  if(envelope.token&&!review)throw new HttpError(400,'La revisión venció o cambió el archivo. Revisa nuevamente.')
  if(!review){
   await limit(db,`backup:new:${user.id}`,30)
   await db.prepare('DELETE FROM backup_restores WHERE id IN (SELECT id FROM backup_restores WHERE expires_at<=? ORDER BY expires_at LIMIT 100)').bind(now).run()
   const id=crypto.randomUUID();await db.batch([db.prepare('DELETE FROM backup_restores WHERE organization_id=? AND user_id=? AND completed_at IS NULL').bind(org,user.id),db.prepare('INSERT INTO backup_restores(id,organization_id,user_id,token_hash,content_hash,expires_at) VALUES (?,?,?,?,?,?)').bind(id,org,user.id,await digest(token),hash,now+900)]);review={id,validation_cursor:0,validation_ready:0}
  }
  const images=Object.entries(backup.images);let cursor=review.validation_cursor,pixels=0,inflated=0,bytes=0
  const validated:{id:string;logo:string}[]=[]
  try{while(!review.validation_ready&&cursor<images.length&&validated.length<10){const [id,logo]=images[cursor];const info=inspectLogo(logo);const nextPixels=info.width*info.height,nextInflated=info.inflatedBytes||nextPixels*4;if(validated.length&&(pixels+nextPixels>4194304||inflated+nextInflated>33554432||bytes+logo.length>2000000))break;await validateRaster(info);pixels+=nextPixels;inflated+=nextInflated;bytes+=logo.length;validated.push({id,logo});cursor++}}catch(e){throw new HttpError(400,e instanceof Error?e.message:'Logo inválido')}
  if(!review.validation_ready){const gate='EXISTS (SELECT 1 FROM backup_restores WHERE id=? AND validation_cursor=? AND validation_ready=0 AND completed_at IS NULL AND expires_at>?)';const statements=validated.map(image=>db.prepare(`INSERT OR IGNORE INTO backup_restore_images(restore_id,logo_id,logo) SELECT ?,?,? WHERE ${gate}`).bind(review!.id,image.id,image.logo,review!.id,review!.validation_cursor,now));statements.push(db.prepare('UPDATE backup_restores SET validation_cursor=?,validation_ready=? WHERE id=? AND validation_cursor=? AND validation_ready=0 AND completed_at IS NULL AND expires_at>?').bind(cursor,Number(cursor===images.length),review.id,review.validation_cursor,now));await db.batch(statements)}
  const progress=await db.prepare('SELECT validation_cursor,validation_ready FROM backup_restores WHERE id=?').bind(review.id).first<{validation_cursor:number;validation_ready:number}>()
  if(!progress?.validation_ready)return Response.json({token,ready:false,validatedImages:progress?.validation_cursor??0,totalImages:images.length})
  const identity=await backupIdentity(db,org,backup)
  return Response.json({token,ready:true,validatedImages:images.length,totalImages:images.length,businessName:backup.business.name,exportedAt:backup.exportedAt,customers:backup.customers.length,catalog:backup.catalog.length,quotes:backup.quotes.length,items:backup.items.length,trashed:backup.quotes.filter(q=>q.deleted_at).length,changes:identity.counts,customersMerged:identity.customerDuplicates.size})
 }
 if(envelope.confirm!==true||typeof envelope.token!=='string')throw new HttpError(400,'Revisa y confirma la restauración primero')
 const preview=await db.prepare('SELECT id FROM backup_restores WHERE organization_id=? AND user_id=? AND token_hash=? AND content_hash=? AND validation_ready=1 AND completed_at IS NULL AND expires_at>?').bind(org,user.id,await digest(envelope.token),hash,now).first<{id:string}>()
 if(!preview)throw new HttpError(400,'La revisión venció, cambió el archivo, no terminó o ya se utilizó. Revisa nuevamente.')
 const identity=await backupIdentity(db,org,backup)
 const operation=crypto.randomUUID(),gate='EXISTS (SELECT 1 FROM backup_restores WHERE id=? AND consumption_id=?)',gateValues=[preview.id,operation]
 const statements=[db.prepare('UPDATE backup_restores SET completed_at=CURRENT_TIMESTAMP,consumption_id=? WHERE id=? AND completed_at IS NULL AND expires_at>?').bind(operation,preview.id,Math.floor(Date.now()/1000))]
 const {maps,existing}=identity
 const newQuotes=backup.quotes.filter(row=>!existing.quotes.has(maps.quotes.get(row.id as string)!))
 const newPositions=new Map(newQuotes.map((row,index)=>[row.id as string,index+1]))
 // JSON row batches keep the number of D1 queries low and bind all imported data.
 const bulk=(table:string,columns:string[],rows:Record<string,unknown>[],quoteNumbers=false)=>{
  let chunk:Record<string,unknown>[]=[];let bytes=0
  const flush=()=>{if(!chunk.length)return;const expressions=columns.map(key=>key==='branding_snapshot'?`CASE WHEN json_extract(e.value,'$.branding_snapshot') IS NULL THEN NULL ELSE json_set(json_extract(e.value,'$.branding_snapshot'),'$.logo',(SELECT logo FROM backup_restore_images WHERE restore_id=? AND logo_id=json_extract(json_extract(e.value,'$.branding_snapshot'),'$.logo'))) END`:['created_at','updated_at'].includes(key)?`COALESCE(json_extract(e.value,'$.${key}'),CURRENT_TIMESTAMP)`:`json_extract(e.value,'$.${key}')`);if(quoteNumbers)expressions.push(`COALESCE((SELECT q.quote_number FROM quotes q WHERE q.id=json_extract(e.value,'$.id') AND q.organization_id=json_extract(e.value,'$.organization_id')),(SELECT printf('Q-%04d',s.value-${newQuotes.length}+json_extract(e.value,'$.__index')) FROM quote_sequences s WHERE s.organization_id=json_extract(e.value,'$.organization_id')))`);const update=table==='customers'||table==='catalog_items'||table==='quotes';const fields=columns.filter(key=>!['id','organization_id','created_at','updated_at'].includes(key));let conflict=update?` ON CONFLICT(id) DO UPDATE SET ${fields.map(key=>`${key}=excluded.${key}`).join(',')} WHERE ${table}.organization_id=excluded.organization_id`:'';if(table==='backup_customer_aliases')conflict=' ON CONFLICT(organization_id,source_id) DO UPDATE SET customer_id=excluded.customer_id';if(table==='quotes')conflict=conflict.replace(' WHERE ', ',revision=quotes.revision+1,updated_at=CURRENT_TIMESTAMP WHERE ');statements.push(db.prepare(`INSERT INTO ${table} (${[...columns,...(quoteNumbers?['quote_number']:[])].join(',')}) SELECT ${expressions.join(',')} FROM json_each(?) e WHERE ${gate}${conflict}`).bind(...(columns.includes('branding_snapshot')?[preview.id]:[]),JSON.stringify(chunk),...gateValues));chunk=[];bytes=0}

  for(const row of rows){const length=new TextEncoder().encode(JSON.stringify(row)).length;if(chunk.length>=100||bytes+length>800000)flush();chunk.push(row);bytes+=length}flush()
 }
 bulk('customers',['id','organization_id','name','company','phone','email','tax_id','address','created_at'],backup.customers.map(row=>({...row,id:maps.customers.get(row.id as string),organization_id:org})))
 const customerAliases=[...maps.customers,...identity.customerDuplicates].map(([source,target])=>({organization_id:org,source_id:source,customer_id:target}))
 if(identity.customerDuplicates.size){
  const duplicates=JSON.stringify([...identity.customerDuplicates].map(([source,target])=>({source,target})))
  const replacement="(SELECT json_extract(e.value,'$.target') FROM json_each(?) e WHERE json_extract(e.value,'$.source')=customer_id)",sources="SELECT json_extract(e.value,'$.source') FROM json_each(?) e"
  statements.push(db.prepare(`UPDATE quotes SET customer_id=${replacement} WHERE organization_id=? AND customer_id IN (${sources}) AND ${gate}`).bind(duplicates,org,duplicates,...gateValues))
  statements.push(db.prepare(`UPDATE backup_customer_aliases SET customer_id=${replacement} WHERE organization_id=? AND customer_id IN (${sources}) AND ${gate}`).bind(duplicates,org,duplicates,...gateValues))
  statements.push(db.prepare(`DELETE FROM customers WHERE organization_id=? AND id IN (${sources}) AND ${gate}`).bind(org,duplicates,...gateValues))
 }
 bulk('backup_customer_aliases',['organization_id','source_id','customer_id'],customerAliases)
 bulk('catalog_items',['id','organization_id','name','description','unit_price','unit','category','duration','valid_until','reviewed_at','stale_after_days','active','created_at'],backup.catalog.slice().sort((a,b)=>Number(a.active)-Number(b.active)).map(row=>({...row,id:maps.catalog.get(row.id as string),organization_id:org})))
 if(newQuotes.length)statements.push(db.prepare(`INSERT INTO quote_sequences(organization_id,value) SELECT ?,? WHERE ${gate} ON CONFLICT(organization_id) DO UPDATE SET value=value+excluded.value`).bind(org,newQuotes.length,...gateValues))
 bulk('quotes',['id','organization_id','customer_id','status','issue_date','expiry_date','subtotal','discount','tax','total','notes','payment_terms','surcharge_type','surcharge_value','surcharge','branding_snapshot','branding_captured_at','deleted_at','write_token','created_at','updated_at'],backup.quotes.slice().sort((a,b)=>Number(!a.deleted_at)-Number(!b.deleted_at)).map(row=>({...row,id:maps.quotes.get(row.id as string),organization_id:org,customer_id:maps.customers.get(row.customer_id as string),write_token:operation,__index:newPositions.get(row.id as string)||0})),true)
 statements.push(db.prepare(`DELETE FROM quote_items WHERE quote_id IN (SELECT q.id FROM quotes q WHERE q.organization_id=? AND q.write_token=?) AND ${gate}`).bind(org,operation,...gateValues))
 bulk('quote_items',['id','quote_id','description','quantity','unit_price','tax_rate','line_subtotal','line_tax','line_total','sort_order','catalog_item_id','unit','duration','valid_until'],backup.items.map(row=>({...row,id:crypto.randomUUID(),quote_id:maps.quotes.get(row.quote_id as string),catalog_item_id:row.catalog_item_id?maps.catalog.get(row.catalog_item_id as string):null})))
 bulk('audit_events',['id','organization_id','quote_id','action','actor_user_id','actor_email','detail'],backup.quotes.map(row=>({id:crypto.randomUUID(),organization_id:org,quote_id:maps.quotes.get(row.id as string),action:existing.quotes.has(maps.quotes.get(row.id as string)!)?'quote.backup.updated':'quote.imported',actor_user_id:user.id,actor_email:user.email,detail:JSON.stringify({originalNumber:row.quote_number})})))
 if(envelope.updateProfile===true)statements.push(db.prepare(`UPDATE organizations SET name=?,logo=(SELECT logo FROM backup_restore_images WHERE restore_id=? AND logo_id=?),primary_color=?,accent_color=?,tax_id=?,address=?,phone=?,contact_email=?,payment_terms=?,quote_template=? WHERE id=? AND ${gate}`).bind(backup.business.name,preview.id,...['logo','primaryColor','accentColor','taxId','address','phone','contactEmail','paymentTerms'].map(k=>backup.business[k]??null),backup.business.quoteTemplate??'default',org,...gateValues))
 statements.push(auditStatement(db,user,'backup.restored',null,{customers:backup.customers.length,catalog:backup.catalog.length,quotes:backup.quotes.length,updateProfile:envelope.updateProfile===true,changes:identity.counts,customersMerged:identity.customerDuplicates.size},{sql:gate,values:gateValues}))
 statements.push(db.prepare(`DELETE FROM backup_restore_images WHERE restore_id=? AND ${gate}`).bind(preview.id,...gateValues))
 const result=await db.batch(statements)
 if(!result[0].meta.changes)throw new HttpError(409,'Este respaldo ya fue aplicado o su revisión venció')
 return Response.json({restored:true,quotes:backup.quotes.length,changes:identity.counts,customersMerged:identity.customerDuplicates.size})
}
