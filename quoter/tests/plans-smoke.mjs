import assert from 'node:assert/strict'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount(),outsider=await testAccount(),a=await testAccount(),b=await testAccount()
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
const plan=await call(owner,'/plans');assert.equal(plan.plan.id,'gratis');assert.equal(plan.usage.seats,1);assert.equal(plan.plan.quoteLimit,25);assert.equal(plan.plan.catalogLimit,100);assert.equal(plan.plan.memberLimit,3)
const customer=await call(owner,'/customers',{name:'Cliente de límites'},'POST',201)
const input={customerId:customer.id,issueDate:'2026-10-01',items:[{description:'Trabajo',quantity:1,unitPrice:100}]}
const quotes=[];for(let i=0;i<24;i++)quotes.push(await call(owner,'/quotes',input,'POST',201))
const race=await Promise.all([owner.request(base+'/api/quotes',{method:'POST',body:JSON.stringify(input)}),owner.request(base+'/api/quotes',{method:'POST',body:JSON.stringify(input)})]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);assert.equal((await call(owner,'/plans')).usage.quotes,25)
await call(owner,'/quotes/'+quotes[0].id+'/duplicate',{},'POST',409)
await call(owner,'/quotes/'+quotes[0].id,{...input,notes:'Edición permitida al máximo'},'PUT')
await call(owner,'/quotes/'+quotes[0].id,{},'DELETE');const replacement=await call(owner,'/quotes',input,'POST',201);assert.equal(replacement.quoteNumber,'Q-0026')
await call(owner,'/trash/'+quotes[0].id+'/restore',{},'POST',409);assert.equal((await call(owner,'/trash')).length,1)
await call(owner,'/plans',{planId:'pro',organizationId:outsider.user.organizationId},'PATCH');assert.equal((await call(outsider,'/plans')).plan.id,'gratis')
await call(owner,'/quotes',input,'POST',201);await call(owner,'/plans',{planId:'gratis'},'PATCH');assert.equal((await call(owner,'/plans')).usage.quotes,26);await call(owner,'/quotes',input,'POST',409)
const backup=await call(owner,'/backups/export')
backup.catalog=Array.from({length:100},(_,i)=>({id:'plan-item-'+i,name:'Tarifa '+i,description:null,unit_price:100,unit:'hora',category:'Servicio',duration:null,valid_until:null,reviewed_at:'2026-10-14',stale_after_days:90,active:1}))
backup.business.plan_id='negocio'
async function restore(file){const preview=await call(owner,'/backups/preview',{backup:file});return call(owner,'/backups/restore',{backup:file,token:preview.token,confirm:true,updateProfile:true})}
await restore(backup);assert.equal((await call(owner,'/plans')).usage.catalog,100);assert.equal((await call(owner,'/plans')).plan.id,'gratis')
const catalogInput={name:'Nueva tarifa',unit:'hora',category:'Servicio',unitPrice:100,staleAfterDays:90}
await call(owner,'/catalog',catalogInput,'POST',409)
const items=await call(owner,'/catalog');await call(owner,'/catalog/'+items[0].id,{},'DELETE');await call(owner,'/catalog',catalogInput,'POST',201)
await call(owner,'/catalog/'+items[0].id,{...catalogInput,active:true},'PUT',409)
const currentBackup=await call(owner,'/backups/export'),tooMany=structuredClone(currentBackup);tooMany.catalog.push({...tooMany.catalog.find(i=>i.active===1),id:'overflow'})
const preview=await call(owner,'/backups/preview',{backup:tooMany});await call(owner,'/backups/restore',{backup:tooMany,token:preview.token,confirm:true},'POST',409);assert.equal((await call(owner,'/catalog')).length,currentBackup.catalog.length)
const swapped=structuredClone(currentBackup);const oldActive=swapped.catalog.find(i=>i.active===1);oldActive.active=0;swapped.catalog.unshift({...oldActive,id:'replacement-at-capacity',active:1});await restore(swapped);assert.equal((await call(owner,'/plans')).usage.catalog,100)
// Pending invitations reserve seats; accepting transfers, rather than consumes, a seat.
const invite=async(user)=>call(owner,'/team/invitations',{email:user.email,role:'viewer'},'POST',201)
const invitations=await Promise.all([invite(a),invite(b)]);assert.equal((await call(owner,'/plans')).usage.seats,3)
await call(owner,'/team/invitations',{email:outsider.email,role:'viewer'},'POST',409)
const resend=await invite(a);assert.equal((await call(owner,'/plans')).usage.seats,3)
const token=new URLSearchParams(new URL(resend.previewUrl).hash.slice(1)).get('token');await call(a,'/invitations/accept',{token});assert.equal((await call(owner,'/plans')).usage.seats,3)
await call(a,'/plans',undefined,'POST',403);await call(a,'/plans',{planId:'pro'},'PATCH',403)
await call(owner,'/team/invitations/'+invitations[1].id,{},'DELETE');assert.equal((await call(owner,'/plans')).usage.seats,2)
await invite(outsider);assert.equal((await call(owner,'/plans')).usage.seats,3)
console.log('Plans passed: quota races/rollback, duplicate/restore/catalog activation, overwrite backups, downgrade preservation, pending seat reservations, resends, acceptance, isolation and role checks.')
