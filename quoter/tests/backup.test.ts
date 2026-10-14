import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBackup,quotesCsv } from '../src/lib/backup.ts'
const fixture={format:'quoter-business-backup',version:1,exportedAt:'2026-10-13T00:00:00Z',business:{name:'Negocio',currency:'GTQ',logo:null,primaryColor:'#4b1390',accentColor:'#ffffff'},customers:[{id:'c',name:'Cliente'}],catalog:[],quotes:[{id:'q',customer_id:'c',quote_number:'Q-0001',status:'accepted',issue_date:'2026-10-01',expiry_date:null,subtotal:10000,tax:1200,discount:0,surcharge:0,surcharge_type:'none',surcharge_value:0,total:11200}],items:[{id:'i',quote_id:'q',description:'Histórica',quantity:1,unit_price:10000,tax_rate:12,line_subtotal:10000,line_tax:1200,line_total:11200,sort_order:0,unit:'unidad'}]}
test('backup validation preserves historical tax and rejects forged totals or dangling references',()=>{
 assert.equal(validateBackup(fixture).quotes[0].total,11200)
 const changed=structuredClone(fixture);changed.quotes[0].total=1;assert.throws(()=>validateBackup(changed),/Totales/)
 const dangling=structuredClone(fixture);dangling.items[0].quote_id='foreign';assert.throws(()=>validateBackup(dangling),/Referencia/)
 const duplicate=structuredClone(fixture);duplicate.customers.push({...fixture.customers[0]});assert.throws(()=>validateBackup(duplicate),/duplicados/)
 const wrongVersion=structuredClone(fixture);wrongVersion.version=2;assert.throws(()=>validateBackup(wrongVersion),/versión/)
})
test('CSV safely escapes spreadsheet formulas, quotes and multiline text',()=>{
 const csv=quotesCsv([{quote_number:'Q-0001',customer_name:' =HYPERLINK("evil")',subtotal:100,tax:0,discount:0,surcharge:0,total:100,notes:'Dos\nlíneas'}])
 assert.ok(csv.startsWith('\uFEFF'))
 assert.ok(csv.includes('"\' =HYPERLINK(""evil"")"'))
 assert.ok(csv.includes('"Dos\nlíneas"'))
})

test('backup projection drops unrelated data before persistence and hashing',()=>{
 const input=structuredClone(fixture) as typeof fixture & {users:unknown[]}
 input.users=[{password:'never import'}]
 Object.assign(input.customers[0],{organization_id:'foreign',unrelated:'never import'})
 const result=validateBackup(input)
 assert.ok(!Object.hasOwn(result,'users'))
 assert.ok(!Object.hasOwn(result.customers[0],'organization_id'))
 assert.ok(!Object.hasOwn(result.customers[0],'unrelated'))
})
