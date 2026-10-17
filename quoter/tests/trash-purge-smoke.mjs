import assert from 'node:assert/strict'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount(),outsider=await testAccount(),editor=await testAccount(),viewer=await testAccount()
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
await call(owner,'/plans',{planId:'pro'},'PATCH')
for(const [member,role] of [[editor,'editor'],[viewer,'viewer']]){
 const invite=await call(owner,'/team/invitations',{email:member.email,role},'POST',201),token=new URLSearchParams(new URL(invite.previewUrl).hash.slice(1)).get('token')
 await call(member,'/invitations/accept',{token})
}
const customer=await call(owner,'/customers',{name:'Cliente de papelera'},'POST',201),input={customerId:customer.id,issueDate:'2026-10-14',items:[{description:'Primera partida',quantity:1,unitPrice:100},{description:'Segunda partida',quantity:2,unitPrice:200}]}
const active=await call(owner,'/quotes',input,'POST',201),quote=await call(owner,'/quotes',input,'POST',201)
await call(owner,'/trash/'+active.id,{confirm:active.quoteNumber,revision:active.revision},'DELETE',404)
await call(owner,'/quotes/'+quote.id,{},'DELETE')
const trash=(await call(owner,'/trash')).find(row=>row.id===quote.id),confirmation={confirm:trash.quoteNumber,revision:trash.revision}
assert.ok(Number.isSafeInteger(trash.revision))
await call(owner,'/trash/'+quote.id,{confirm:trash.quoteNumber},'DELETE',400)
await call(owner,'/trash/'+quote.id,{...confirmation,confirm:trash.quoteNumber+' '},'DELETE',400)
await call(owner,'/trash/'+quote.id,{...confirmation,revision:trash.revision-1},'DELETE',409)
await call(outsider,'/trash/'+quote.id,confirmation,'DELETE',404)
for(const user of [editor,viewer])await call(user,'/trash/'+quote.id,confirmation,'DELETE',403)
assert.equal((await call(owner,'/trash')).filter(row=>row.id===quote.id).length,1)
assert.deepEqual(await call(owner,'/trash/'+quote.id,confirmation,'DELETE'),{purged:true})
await call(owner,'/trash/'+quote.id,confirmation,'DELETE',404)
await call(owner,'/quotes/'+quote.id,undefined,'GET',404)
assert.equal((await call(owner,'/trash')).filter(row=>row.id===quote.id).length,0)
const audit=(await call(owner,'/history')).filter(row=>row.action==='quote.purged'&&JSON.parse(row.detail).quoteNumber===quote.quoteNumber);assert.equal(audit.length,1)
assert.equal((await call(owner,'/quotes/'+active.id)).items.length,2)
// Only one of restore and permanent deletion can succeed for the same revision.
const racing=await call(owner,'/quotes',input,'POST',201);await call(owner,'/quotes/'+racing.id,{},'DELETE')
const racingTrash=(await call(owner,'/trash')).find(row=>row.id===racing.id),purge={confirm:racingTrash.quoteNumber,revision:racingTrash.revision}
const [restored,purged]=await Promise.all([owner.request(base+'/api/trash/'+racing.id+'/restore',{method:'POST',body:'{}'}),owner.request(base+'/api/trash/'+racing.id,{method:'DELETE',body:JSON.stringify(purge)})])
assert.equal([restored,purged].filter(r=>r.status===200).length,1)
assert.ok([404,409].includes(restored.status===200?purged.status:restored.status))
if(restored.status===200)assert.equal((await call(owner,'/quotes/'+racing.id)).items.length,2)
else await call(owner,'/quotes/'+racing.id,undefined,'GET',404)
console.log('Trash purge passed: exact confirmation, revision, owner/tenant/active protection, permanent removal, unique audit and restore race.')
