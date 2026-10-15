import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Miniflare,convertV4MiniflareOptions } from 'miniflare'
import { d1Diagnostic } from './d1-diagnostic.mjs'

const quote=name=>'"'+name.replaceAll('"','""')+'"'
export function recoveryRuntime(state){
 return new Miniflare(convertV4MiniflareOptions({modules:true,script:'',resourcePersistencePath:join(state,'v3'),d1Databases:{DB:'00000000-0000-0000-0000-000000000000'}}))
}
// Exported SQL embeds logos/branding as literals; D1 caps SQL text independently
// of bound values. Materialize trusted SQL locally, then load rows with bindings.
export async function restoreParameterized(sql,state){
 const source=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false,allowExtension:false})
 let runtime
 try{
  source.exec(readFileSync(sql,'utf8'))
  if(source.prepare('PRAGMA quick_check').get().quick_check!=='ok'||source.prepare('PRAGMA foreign_key_check').all().length)throw new Error('FOREIGN KEY constraint failed')
  const schema=source.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY rowid").all().filter(row=>!row.name.startsWith('sqlite_')&&!row.name.startsWith('_cf_'))
  const tables=schema.filter(row=>row.type==='table'),pending=new Map(tables.map(table=>[table.name,table])),ordered=[],done=new Set()
  while(pending.size){
   let progress=false
   for(const [name,table] of pending){
    const parents=source.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all().map(row=>row.table).filter(parent=>parent!==name)
    if(parents.every(parent=>done.has(parent))){ordered.push(table);done.add(name);pending.delete(name);progress=true}
   }
   if(!progress)throw new Error('FOREIGN KEY constraint failed')
  }
  runtime=recoveryRuntime(state);const db=await runtime.getD1Database('DB')
  for(const table of tables)await db.prepare(table.sql).run()
  let rows=0
  for(const table of ordered){
   const columns=source.prepare(`PRAGMA table_xinfo(${quote(table.name)})`).all().filter(column=>column.hidden===0).map(column=>column.name)
   const names=columns.map(quote).join(','),insert=`INSERT INTO ${quote(table.name)} (${names}) VALUES (${columns.map(()=>'?').join(',')})`
   const statement=source.prepare(`SELECT ${names} FROM ${quote(table.name)}`);statement.setReadBigInts(true)
   for(const row of statement.iterate()){
    const values=columns.map(name=>{const value=row[name];if(typeof value==='bigint'){if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER))throw new Error('SQLITE_TOOBIG');return Number(value)}return value instanceof Uint8Array?Array.from(value):value})
    await db.prepare(insert).bind(...values).run();rows++
   }
   const expected=source.prepare(`SELECT count(*) AS n FROM ${quote(table.name)}`).get().n
   if((await db.prepare(`SELECT count(*) AS n FROM ${quote(table.name)}`).first()).n!==expected)throw new Error('SQLITE_ERROR')
  }
  // Preserve AUTOINCREMENT high-water marks, including deleted records.
  if(source.prepare("SELECT 1 FROM sqlite_schema WHERE name='sqlite_sequence'").get()){
   await db.prepare('DELETE FROM sqlite_sequence').run()
   for(const row of source.prepare('SELECT name,seq FROM sqlite_sequence').all())await db.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)').bind(row.name,row.seq).run()
  }
  // Creating triggers after data avoids replaying business side effects.
  for(const entry of schema.filter(row=>row.type!=='table'))await db.prepare(entry.sql).run()
  if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw new Error('FOREIGN KEY constraint failed')
  return {tables:tables.length,rows}
 }catch(error){
  throw new Error(`Falló D1: etapa=import_parametrizado, categoria=${d1Diagnostic({stderr:String(error)})}. No se muestran SQL ni datos privados.`)
 }finally{source.close();if(runtime)await runtime.dispose()}
}
