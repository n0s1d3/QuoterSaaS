import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount(),other=await testAccount(),reference='test-payment-'+randomUUID()
const invoke=(business,plan,ref)=>spawnSync(process.execPath,['scripts/activate-plan.mjs','--business',business,'--plan',plan,'--reference',ref,'--operator','operator@example.com'],{encoding:'utf8'})
const read=async()=>{const r=await owner.request(base+'/api/plans');assert.equal(r.status,200);return r.json()}
const initial=await read();assert.equal(initial.businessId,owner.user.organizationId)
let result=invoke(initial.businessId,'3',reference);assert.equal(result.status,0,result.stderr+result.stdout)
assert.equal((await read()).plan.name,'Plan 3');assert.equal((await read()).plan.memberLimit,5)
result=invoke(initial.businessId,'3',reference);assert.equal(result.status,0,result.stderr+result.stdout)
result=invoke(other.user.organizationId,'2',reference);assert.notEqual(result.status,0);assert.equal((await(await other.request(base+'/api/plans')).json()).plan.name,'Plan 1')
result=invoke(initial.businessId,'2',reference);assert.notEqual(result.status,0);assert.equal((await read()).plan.name,'Plan 3')
result=invoke('missing-business','2','missing-'+randomUUID());assert.notEqual(result.status,0)
result=invoke(initial.businessId,'1',reference+'-downgrade');assert.equal(result.status,0,result.stderr+result.stdout);assert.equal((await read()).plan.name,'Plan 1')
result=invoke(initial.businessId,'3',reference);assert.equal(result.status,0);assert.equal((await read()).plan.name,'Plan 1')
const history=await(await owner.request(base+'/api/history')).json(),activations=history.filter(event=>event.action==='plan.activated.manually')
assert.equal(activations.length,2);assert.ok(activations.every(event=>event.actorEmail==='operator@example.com'));const first=activations.find(event=>JSON.parse(event.detail).paymentReference===reference);assert.equal(JSON.parse(first.detail).previousPlanId,'gratis');assert.equal(JSON.parse(first.detail).planId,'negocio')
console.log('Manual activation passed: assignment, idempotency, conflicting references, missing business, downgrade and safe replay.')
