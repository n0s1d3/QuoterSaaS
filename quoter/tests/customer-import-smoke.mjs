import assert from 'node:assert/strict'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount(),target=await testAccount()
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
const profile={name:'Ana de importación',email:'ana@example.com',phone:'5555-1234',company:'Empresa',taxId:'123-K',address:'Ciudad'}
const original=await call(owner,'/customers',profile,'POST',201),legacy=await call(owner,'/customers',profile,'POST',201),different=await call(owner,'/customers',{...profile,email:'otra@example.com'},'POST',201)
const input={customerId:legacy.id,issueDate:'2026-10-14',items:[{description:'Trabajo',quantity:1,unitPrice:100}]}
const live=await call(owner,'/quotes',input,'POST',201),trashed=await call(owner,'/quotes',input,'POST',201);await call(owner,'/quotes/'+trashed.id,{},'DELETE')
const backup=await call(owner,'/backups/export')
async function restore(user,file){const preview=await call(user,'/backups/preview',{backup:file});await call(user,'/backups/restore',{backup:file,token:preview.token,confirm:true});return preview}
// A capacity failure must roll back customer consolidation and quote relinking too.
const overflow=structuredClone(backup),template=overflow.quotes.find(row=>row.id===live.id),line=overflow.items.find(row=>row.quote_id===live.id)
for(let i=0;i<25;i++){const id='overflow-'+i;overflow.quotes.push({...template,id,quote_number:'overflow-'+i});overflow.items.push({...line,id:'overflow-line-'+i,quote_id:id})}
const rejected=await call(owner,'/backups/preview',{backup:overflow});await call(owner,'/backups/restore',{backup:overflow,token:rejected.token,confirm:true},'POST',409)
assert.equal((await call(owner,'/customers')).length,3);assert.equal((await call(owner,'/quotes/'+live.id)).customerId,legacy.id)
const preview=await restore(owner,backup);assert.equal(preview.customersMerged,1)
let customers=await call(owner,'/customers');assert.equal(customers.length,2);assert.ok(customers.some(row=>row.id===different.id));const canonical=customers.find(row=>row.email===profile.email)
assert.equal((await call(owner,'/quotes/'+live.id)).customerId,canonical.id)
await call(owner,'/trash/'+trashed.id+'/restore',{});assert.equal((await call(owner,'/quotes/'+trashed.id)).customerId,canonical.id)
await restore(owner,backup);assert.equal((await call(owner,'/customers')).length,2)
// A backup with renamed source IDs reuses matching contacts instead of inserting another customer.
const renamed=structuredClone(backup),renamedIds=new Map(renamed.customers.map(row=>[row.id,'foreign-'+row.id]));renamed.customers.forEach(row=>row.id=renamedIds.get(row.id));renamed.quotes.forEach(row=>row.customer_id=renamedIds.get(row.customer_id));await restore(owner,renamed);assert.equal((await call(owner,'/customers')).length,2)
// Saved aliases also preserve identities when the source backup changes contact data.
renamed.customers.filter(row=>row.email===profile.email).forEach(row=>row.phone='5555-9999');await restore(owner,renamed);customers=await call(owner,'/customers');assert.equal(customers.length,2);assert.equal(customers.find(row=>row.id===canonical.id).phone,'5555-9999')
const targetExisting=await call(target,'/customers',{...profile,phone:'5555-9999'},'POST',201)
await restore(target,renamed);assert.equal((await call(target,'/customers')).length,2);for(const row of await call(target,'/quotes'))assert.equal((await call(target,'/quotes/'+row.id)).customerId,targetExisting.id);await restore(target,renamed);assert.equal((await call(target,'/customers')).length,2)
assert.ok(original.id!==legacy.id)
console.log('Customer import passed: legacy duplicate cleanup, preserved live/trash quote links, complete-profile matching, homonyms, changed IDs, persistent aliases, cross-business isolation and repeated restores.')
