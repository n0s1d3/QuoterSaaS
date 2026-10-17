import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync,readdirSync } from 'node:fs'
import { customers } from '../worker/routes/customers.ts'
import { catalog } from '../worker/routes/catalog.ts'
function fixture() {
 const sqlite=new DatabaseSync(':memory:'),queries:string[]=[]
 const migrations=new URL('../migrations/',import.meta.url)
 for(const file of readdirSync(migrations).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,migrations),'utf8'))
 sqlite.exec("INSERT INTO organizations(id,name,slug) VALUES('org','Business','business'),('other','Other','other'); WITH RECURSIVE fixture(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM fixture WHERE n<505) INSERT INTO customers(id,organization_id,name) SELECT 'customer-'||n,'org',printf('Customer %04d',n) FROM fixture; INSERT INTO customers(id,organization_id,name,company) VALUES('literal','org','Álvaro 50%_\\','Special'),('private-customer','other','Private customer','PRIVATE BUSINESS'); WITH RECURSIVE fixture(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM fixture WHERE n<505) INSERT INTO catalog_items(id,organization_id,name,unit_price,active) SELECT 'catalog-'||n,'org',printf('Archived %04d',n),n,0 FROM fixture; INSERT INTO catalog_items(id,organization_id,name,unit_price,active) VALUES('literal','org','ÁSESORÍA 50%_\\',100,1),('ordinary','org','Ordinary product',100,1),('private-catalog','other','Private catalog',100,1)")
 function prepared(sql:string,values:unknown[]=[]):unknown{return {sql,values,bind:(...bound:unknown[])=>prepared(sql,bound),first:async()=>{queries.push(sql);return sqlite.prepare(sql).get(...values as(string|number|null)[])??null},all:async()=>{queries.push(sql);return {results:sqlite.prepare(sql).all(...values as(string|number|null)[])}}}}
 const db={prepare:prepared,batch:async(statements:{sql:string;values:(string|number|null)[]}[])=>{sqlite.exec('BEGIN');try{const results=statements.map(statement=>{queries.push(statement.sql);return{results:sqlite.prepare(statement.sql).all(...statement.values)}});sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}} as unknown as D1Database
 return{sqlite,queries,db}
}
const request=(path:string)=>new Request('https://quoter.example/api/'+path)
const rejected=(status:number)=>(error:unknown)=>error instanceof Error&&'status'in error&&error.status===status

test('customers paginate with bounded rows, totals, literal case-insensitive search and tenant-scoped selected-ID lookup',async()=>{
 const state=fixture();try{
  const page=await(await customers(request('customers?paged=1&limit=50&offset=0'),state.db,'org')).json()
  assert.equal(page.items.length,50);assert.equal(page.total,506);assert.equal(page.hasMore,true)
  assert.ok(page.items.every((item:{id:string})=>item.id!=='private-customer'))
  const next=await(await customers(request('customers?paged=1&limit=50&offset=500'),state.db,'org')).json()
  assert.equal(next.items.length,6);assert.equal(next.hasMore,false)
  const match=await(await customers(request('customers?paged=1&search='+encodeURIComponent('ALVARO 50%_\\')),state.db,'org')).json()
  assert.equal(match.total,1);assert.equal(match.items[0].id,'literal')
  const company=await(await customers(request('customers?paged=1&search=SPECIAL'),state.db,'org')).json();assert.equal(company.items[0].id,'literal')
  const literal=(await(await customers(request('customers?paged=1&search=%25'),state.db,'org')).json());assert.equal(literal.total,1)
  assert.deepEqual(await(await customers(request('customers?id=literal'),state.db,'org')).json(),match.items[0])
  await assert.rejects(()=>customers(request('customers?id=private-customer'),state.db,'org'),rejected(404))
  state.queries.length=0;await assert.rejects(()=>customers(request('customers'),state.db,'org'),rejected(413));assert.equal(state.queries.length,1);assert.ok(state.queries[0].startsWith('SELECT COUNT'))
  assert.equal((await(await customers(request('customers?search=SPECIAL'),state.db,'org')).json()).length,1)
  for(const query of ['paged=1&limit=51','paged=1&limit=0','paged=1&offset=-1','paged=1&offset=1.5','paged=no'])await assert.rejects(()=>customers(request('customers?'+query),state.db,'org'),rejected(400))
 }finally{state.sqlite.close()}
})

test('catalog paginates active and archived items separately, escapes searches and orders sales before applying LIMIT',async()=>{
 const state=fixture();try{
  const active=await(await catalog(request('catalog?paged=1&active=1'),state.db,'org')).json()
  assert.equal(active.total,2);assert.equal(active.items.length,2);assert.equal(active.hasMore,false)
  assert.ok(active.items.every((item:{active:number;id:string})=>item.active===1&&item.id!=='private-catalog'))
  const archived=await(await catalog(request('catalog?paged=1&active=0&limit=5&offset=500'),state.db,'org')).json()
  assert.equal(archived.total,505);assert.equal(archived.items.length,5);assert.equal(archived.hasMore,false)
  const escaped=await(await catalog(request('catalog?paged=1&active=1&search='+encodeURIComponent('asesoria 50%_\\')),state.db,'org')).json();assert.equal(escaped.total,1);assert.equal(escaped.items[0].id,'literal')
  state.sqlite.exec("INSERT INTO quotes(id,organization_id,customer_id,quote_number,issue_date,status) VALUES('quote','org','literal','Q-0001','2026-10-14','accepted'); INSERT INTO quote_items(id,quote_id,description,quantity,unit_price,catalog_item_id) VALUES('line','quote','Sold product',5,100,'ordinary')")
  const sold=await(await catalog(request('catalog?paged=1&active=1&order=sales&limit=1'),state.db,'org')).json();assert.equal(sold.items[0].id,'ordinary');assert.equal(sold.items[0].soldQuantity,5);assert.equal(sold.total,2);assert.equal(sold.hasMore,true)
  state.queries.length=0;await assert.rejects(()=>catalog(request('catalog'),state.db,'org'),rejected(413));assert.equal(state.queries.length,1);assert.ok(state.queries[0].startsWith('SELECT COUNT'))
  assert.equal((await(await catalog(request('catalog?active=1'),state.db,'org')).json()).length,2)
  for(const query of ['paged=1&active=private','paged=1&order=sql','paged=1&limit=51','paged=1&offset=-1'])await assert.rejects(()=>catalog(request('catalog?'+query),state.db,'org'),rejected(400))
 }finally{state.sqlite.close()}
})
