import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { getQuote } from '../worker/db/quotes.ts'
import { createQuote } from '../worker/services/quote-service.ts'

// Execute production SQL against SQLite, exposing only the D1 API used here.
function fixture() {
 const sqlite=new DatabaseSync(':memory:')
 const migrations=new URL('../migrations/',import.meta.url)
 for(const file of readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,migrations),'utf8'))
 sqlite.exec("INSERT INTO organizations(id,name,slug) VALUES('org','Business','business'),('other','Other business','other'); INSERT INTO customers(id,organization_id,name) VALUES('customer','org','Current customer'); INSERT INTO catalog_items(id,organization_id,name,unit_price) VALUES('catalog','org','Service',100),('other-catalog','other','Private catalog',100)")
 const queries:string[]=[],batches:string[][]=[]
 let afterRead:(()=>void)|undefined,beforeBatch:(()=>void)|undefined
 function prepared(sql:string,values:unknown[]=[]):unknown {
  return {sql,values,bind:(...bound:unknown[])=>prepared(sql,bound),first:async()=>{
   queries.push(sql)
   const row=sqlite.prepare(sql).get(...values as (string|number|null)[])??null
   const hook=afterRead;afterRead=undefined;hook?.()
   return row
  },all:async()=>{queries.push(sql);return {results:sqlite.prepare(sql).all(...values as (string|number|null)[])}}}
 }
 const db={prepare:prepared,batch:async(statements:{sql:string;values:(string|number|null)[]}[])=>{
  const hook=beforeBatch;beforeBatch=undefined;hook?.()
  batches.push(statements.map(statement=>statement.sql));sqlite.exec('BEGIN')
  try {
   const results=statements.map(statement=>({results:[],meta:{changes:Number(sqlite.prepare(statement.sql).run(...statement.values).changes)}}))
   sqlite.exec('COMMIT');return results
  }catch(error){sqlite.exec('ROLLBACK');throw error}
 }} as unknown as D1Database
 return {sqlite,db,queries,batches,afterRead:(hook:()=>void)=>{afterRead=hook},beforeBatch:(hook:()=>void)=>{beforeBatch=hook}}
}
const input={customerId:'customer',issueDate:'2026-10-14',notes:'Original notes',paymentTerms:'Original payment terms',items:[{description:'Original item',quantity:1,unitPrice:100,catalogItemId:'catalog'}]}
function rejected(status:number){return (error:unknown)=>error instanceof Error&&'status' in error&&error.status===status}

test('quote detail uses one snapshot for header, customer and ordered lines when an edit commits after the read',async()=>{
 const state=fixture();try {
  const quote=await createQuote(state.db,'org',input)
  state.queries.length=0
  state.afterRead(()=>state.sqlite.exec(`BEGIN; UPDATE quotes SET total=200,subtotal=200,revision=revision+1 WHERE id='${quote.id}'; UPDATE quote_items SET unit_price=200,line_subtotal=200,line_total=200 WHERE quote_id='${quote.id}'; UPDATE customers SET name='New customer name' WHERE id='customer'; COMMIT;`))
  const detail=await getQuote(state.db,'org',quote.id)
  assert.equal(state.queries.length,1)
  assert.equal(detail.revision,quote.revision)
  assert.equal(detail.customer.name,'Current customer')
  assert.equal(detail.total,100)
  assert.equal(detail.items.reduce((sum:number,line:{lineTotal:number})=>sum+line.lineTotal,0),detail.total)
  const current=await getQuote(state.db,'org',quote.id)
  assert.equal(current.total,200);assert.equal(current.items[0].lineTotal,200);assert.equal(current.customer.name,'New customer name')
  await assert.rejects(()=>getQuote(state.db,'other',quote.id),rejected(404))
 }finally{state.sqlite.close()}
})

test('PUT requires the loaded revision and stale edits preserve quote, ordered lines and payment terms',async()=>{
 const state=fixture();try {
  const original=await createQuote(state.db,'org',input)
  const edited=await createQuote(state.db,'org',{...input,revision:original.revision,notes:'Winner',items:[{description:'New item',quantity:2,unitPrice:100}]},original.id)
  assert.equal(edited.revision,original.revision+1)
  const batches=state.batches.length
  for(const revision of [undefined,null,'1',-1,0.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>createQuote(state.db,'org',{...input,revision},original.id),rejected(400))
  await assert.rejects(()=>createQuote(state.db,'org',{...input,revision:original.revision,notes:'Stale'},original.id),rejected(409))
  assert.equal(state.batches.length,batches)
  assert.deepEqual(await getQuote(state.db,'org',original.id),edited)
  // Existing quotes created before revision tracking may legitimately still be 0.
  state.sqlite.prepare('UPDATE quotes SET revision=0 WHERE id=?').run(original.id)
  const legacy=await createQuote(state.db,'org',{...input,revision:0},original.id)
  assert.equal(legacy.revision,1)
 }finally{state.sqlite.close()}
})

test('compare-and-swap also rejects a concurrent commit between validation and the write transaction',async()=>{
 const state=fixture();try {
  state.sqlite.exec("INSERT INTO users(id,organization_id,email,password_hash,password_salt,email_verified_at) VALUES('owner','org','owner@example.com','fixture','salt',CURRENT_TIMESTAMP)")
  const actor={id:'owner',email:'owner@example.com',organizationId:'org',organizationName:'Business',emailVerified:true,role:'owner' as const}
  const original=await createQuote(state.db,'org',input,undefined,actor)
  const eventCount=state.sqlite.prepare('SELECT COUNT(*) AS count FROM audit_events').get()!.count
  state.beforeBatch(()=>state.sqlite.prepare("UPDATE quotes SET revision=revision+1,notes='Concurrent winner' WHERE id=?").run(original.id))
  await assert.rejects(()=>createQuote(state.db,'org',{...input,revision:original.revision,notes:'Lost update',paymentTerms:'Lost payment terms',surchargeType:'fixed',surchargeValue:900,items:[{description:'Lost item',quantity:9,unitPrice:999}]},original.id,actor),rejected(409))
  const current=await getQuote(state.db,'org',original.id)
  assert.deepEqual(current,{...original,revision:original.revision+1,notes:'Concurrent winner'})
  assert.equal(state.sqlite.prepare('SELECT COUNT(*) AS count FROM audit_events').get()!.count,eventCount)
 }finally{state.sqlite.close()}
})

test('100 quote items validate catalog references together and insert once with order, ranges and tenant isolation intact',async()=>{
 const state=fixture();try {
  const items=Array.from({length:100},(_,index)=>({description:'Item '+index,quantity:index+0.125,unitPrice:100,catalogItemId:'catalog',unit:'hora',duration:'2 horas',validUntil:'2026-12-31'}))
  const quote=await createQuote(state.db,'org',{...input,items})
  assert.equal(state.queries.filter(sql=>sql.startsWith('SELECT id FROM catalog_items')).length,1)
  assert.equal(state.batches.at(-1)!.filter(sql=>sql.startsWith('INSERT INTO quote_items')).length,1)
  assert.equal(state.batches.at(-1)!.length,6)
  assert.equal(quote.items.length,100)
  assert.deepEqual(quote.items.map((line:{description:string})=>line.description),items.map(line=>line.description))
  assert.ok(quote.items.every((line:{catalogItemId:string;unit:string;duration:string;validUntil:string;quantity:number},index:number)=>line.catalogItemId==='catalog'&&line.unit==='hora'&&line.duration==='2 horas'&&line.validUntil==='2026-12-31'&&line.quantity===items[index].quantity))
  assert.equal(quote.items.reduce((sum:number,line:{lineTotal:number})=>sum+line.lineTotal,0),quote.total)
  const batches=state.batches.length
  await assert.rejects(()=>createQuote(state.db,'org',{...input,items:[...items,items[0]]}),rejected(400))
  await assert.rejects(()=>createQuote(state.db,'org',{...input,items:[...items.slice(0,99),{...items[99],catalogItemId:'other-catalog'}]}),rejected(400))
  await assert.rejects(()=>createQuote(state.db,'org',{...input,items:[{...items[0],unitPrice:0.1}]}),rejected(400))
  assert.equal(state.batches.length,batches)
 }finally{state.sqlite.close()}
})
