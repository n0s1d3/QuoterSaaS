import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dataHistory } from '../worker/routes/data-history.ts'

const actor={id:'owner',email:'owner@example.com',organizationId:'org',organizationName:'Business',emailVerified:true,role:'owner' as const}
function fixture(){
 const sqlite=new DatabaseSync(':memory:'),directory=new URL('../migrations/',import.meta.url)
 for(const file of readdirSync(directory).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,directory),'utf8'))
 sqlite.exec("INSERT INTO organizations(id,name,slug) VALUES('org','Business','business'),('other','Other','other');INSERT INTO users(id,organization_id,email,password_hash,password_salt,email_verified_at) VALUES('owner','org','owner@example.com','fixture','salt',CURRENT_TIMESTAMP);INSERT INTO customers(id,organization_id,name) VALUES('customer','org','Customer');INSERT INTO quotes(id,organization_id,customer_id,quote_number,issue_date,revision,deleted_at) VALUES('quote','org','customer','Q-0001','2026-10-14',7,CURRENT_TIMESTAMP);INSERT INTO quote_items(id,quote_id,description) VALUES('one','quote','First'),('two','quote','Second')")
 let beforeBatch:(()=>void)|undefined
 const prepare=(sql:string,values:unknown[]=[]):unknown=>({sql,values,bind:(...values:unknown[])=>prepare(sql,values),first:async()=>sqlite.prepare(sql).get(...values as (string|number|null)[])??null})
 const db={prepare,batch:async(statements:{sql:string;values:(string|number|null)[]}[])=>{
  const hook=beforeBatch;beforeBatch=undefined;hook?.();sqlite.exec('BEGIN')
  try{const result=statements.map(statement=>({results:[],meta:{changes:Number(sqlite.prepare(statement.sql).run(...statement.values).changes)}}));sqlite.exec('COMMIT');return result}catch(error){sqlite.exec('ROLLBACK');throw error}
 }} as unknown as D1Database
 const count=(table:string)=>sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count
 return {sqlite,db,count,beforeBatch:(hook:()=>void)=>{beforeBatch=hook}}
}
function request(data:unknown={confirm:'Q-0001',revision:7}){return new Request('http://localhost/api/trash/quote',{method:'DELETE',body:JSON.stringify(data)})}
function status(expected:number){return (error:unknown)=>error instanceof Error&&'status'in error&&error.status===expected}
test('explicit trash purge removes the quote and its children together and retains its audit',async()=>{
 const state=fixture();try{
  assert.deepEqual(await(await dataHistory(request(),state.db,actor,'/api/trash/quote')).json(),{purged:true})
  assert.equal(state.count('quotes'),0);assert.equal(state.count('quote_items'),0);assert.equal(state.count('customers'),1)
  const audit=state.sqlite.prepare("SELECT action,quote_id,detail FROM audit_events WHERE action='quote.purged'").get()!
  assert.equal(audit.quote_id,'quote');assert.equal(JSON.parse(String(audit.detail)).quoteNumber,'Q-0001')
 }finally{state.sqlite.close()}
})
test('purge requires exact confirmation, loaded revision, trash state, business and owner role',async()=>{
 const state=fixture();try{
  for(const data of [{confirm:'Q-0001'},{confirm:'Q-0001',revision:'7'},{confirm:'Q-0001 ',revision:7},{confirm:'q-0001',revision:7}])await assert.rejects(()=>dataHistory(request(data),state.db,actor,'/api/trash/quote'),status(400))
  await assert.rejects(()=>dataHistory(request({confirm:'Q-0001',revision:6}),state.db,actor,'/api/trash/quote'),status(409))
  await assert.rejects(()=>dataHistory(request(),state.db,{...actor,organizationId:'other'},'/api/trash/quote'),status(404))
  for(const role of ['editor','viewer'] as const)await assert.rejects(()=>dataHistory(request(),state.db,{...actor,role},'/api/trash/quote'),status(403))
  state.sqlite.exec("UPDATE quotes SET deleted_at=NULL WHERE id='quote'")
  await assert.rejects(()=>dataHistory(request(),state.db,actor,'/api/trash/quote'),status(404))
  assert.equal(state.count('quotes'),1);assert.equal(state.count('quote_items'),2);assert.equal(state.count('audit_events'),0)
 }finally{state.sqlite.close()}
})
test('a restore or changed confirmation between validation and commit cannot delete quote items',async()=>{
 for(const update of ["UPDATE quotes SET deleted_at=NULL,revision=revision+1 WHERE id='quote'","UPDATE quotes SET quote_number='Q-0002' WHERE id='quote'"]){
  const state=fixture();try{
   state.beforeBatch(()=>state.sqlite.exec(update))
   await assert.rejects(()=>dataHistory(request(),state.db,actor,'/api/trash/quote'),status(409))
   assert.equal(state.count('quotes'),1);assert.equal(state.count('quote_items'),2);assert.equal(state.count('audit_events'),0)
  }finally{state.sqlite.close()}
 }
})
test('audit failure rolls back the parent and child deletion',async()=>{
 const state=fixture();try{
  state.sqlite.exec("CREATE TRIGGER refuse_purge_audit BEFORE INSERT ON audit_events WHEN NEW.action='quote.purged' BEGIN SELECT RAISE(ABORT,'fixture audit rejection');END;")
  await assert.rejects(()=>dataHistory(request(),state.db,actor,'/api/trash/quote'),/fixture audit rejection/)
  assert.equal(state.count('quotes'),1);assert.equal(state.count('quote_items'),2);assert.equal(state.count('audit_events'),0)
 }finally{state.sqlite.close()}
})
