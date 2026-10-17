import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBackup,quotesCsv } from '../src/lib/backup.ts'
const fixture={format:'quoter-business-backup',version:1,exportedAt:'2026-10-13T00:00:00Z',business:{name:'Negocio',currency:'GTQ',logo:null,primaryColor:'#4b1390',accentColor:'#ffffff'},customers:[{id:'c',name:'Cliente'}],catalog:[],quotes:[{id:'q',customer_id:'c',quote_number:'Q-0001',status:'accepted',issue_date:'2026-10-01',expiry_date:null,subtotal:10000,tax:1200,discount:0,surcharge:0,surcharge_type:'none',surcharge_value:0,total:11200}],items:[{id:'i',quote_id:'q',description:'Histórica',quantity:1,unit_price:10000,tax_rate:12,line_subtotal:10000,line_tax:1200,line_total:11200,sort_order:0,unit:'unidad'}]}
test('backup validation preserves historical tax and rejects forged totals or dangling references',()=>{
 assert.equal(validateBackup(fixture).quotes[0].total,11200)
 const changed=structuredClone(fixture);changed.quotes[0].total=1;assert.throws(()=>validateBackup(changed),/Totales/)
 const dangling=structuredClone(fixture);dangling.items[0].quote_id='foreign';assert.throws(()=>validateBackup(dangling),/Referencia/)
 const duplicate=structuredClone(fixture);duplicate.customers.push({...fixture.customers[0]});assert.throws(()=>validateBackup(duplicate),/duplicados/)
 const wrongVersion=structuredClone(fixture);wrongVersion.version=3;assert.throws(()=>validateBackup(wrongVersion),/versión/)
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

test('v2 deduplicates repeated historical logos without expanding them, and remains stable on reimport',()=>{
 const source=structuredClone(fixture) as unknown as Record<string,unknown>
 const logo='data:image/png;base64,AA==' // Structural normalization; raster decoding belongs to bounded preview batches.
 source.business={...fixture.business,logo}
 source.quotes=Array.from({length:25},(_,i)=>({...fixture.quotes[0],id:'q'+i,branding_snapshot:JSON.stringify({...fixture.business,logo})}))
 source.items=Array.from({length:25},(_,i)=>({...fixture.items[0],id:'i'+i,quote_id:'q'+i}))
 const normalized=validateBackup(source)
 assert.equal(normalized.version,2);assert.equal(Object.keys(normalized.images).length,1)
 assert.equal(normalized.business.logo,'logo-0');assert.equal(JSON.parse(String(normalized.quotes[0].branding_snapshot)).logo,'logo-0')
 assert.deepEqual(validateBackup(normalized),normalized)
 const broken=structuredClone(normalized);broken.business.logo='missing';assert.throws(()=>validateBackup(broken),/Referencia|Texto/)
 assert.equal((source.business as Record<string,unknown>).logo,logo,'normalization does not mutate the upload')
})

test('historical timestamps accept D1 and ISO instants and reject invalid or non-text metadata',()=>{
 const source=structuredClone(fixture)
 Object.assign(source.customers[0],{created_at:'2020-01-02 03:04:05'})
 Object.assign(source.quotes[0],{created_at:'2020-01-02T03:04:05.000Z',updated_at:'2020-02-03 04:05:06'})
 assert.equal(validateBackup(source).customers[0].created_at,'2020-01-02 03:04:05')
 for(const created_at of ['2020-02-30 03:04:05','today',42]){const invalid=structuredClone(source);Object.assign(invalid.customers[0],{created_at});assert.throws(()=>validateBackup(invalid),/Fecha|Texto/)}
})

test('backups preserve default and snapshot templates and reject unknown models',()=>{
 const source=structuredClone(fixture)
 Object.assign(source.business,{quoteTemplate:'corporate'})
 Object.assign(source.quotes[0],{branding_snapshot:JSON.stringify({...fixture.business,quoteTemplate:'sidebar'})})
 const normalized=validateBackup(source)
 assert.equal(normalized.business.quoteTemplate,'corporate');assert.equal(JSON.parse(String(normalized.quotes[0].branding_snapshot)).quoteTemplate,'sidebar')
 assert.deepEqual(validateBackup(normalized),normalized)
 assert.equal(validateBackup(fixture).business.quoteTemplate,undefined,'legacy backups keep default compatibility')
 Object.assign(source.business,{quoteTemplate:'unknown'});assert.throws(()=>validateBackup(source),/Plantilla/)
 Object.assign(source.business,{quoteTemplate:'default'});Object.assign(source.quotes[0],{branding_snapshot:JSON.stringify({...fixture.business,quoteTemplate:'unknown'})});assert.throws(()=>validateBackup(source),/Plantilla/)
})
