import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quotaLevel } from '../src/lib/plans.ts'
import { plans } from '../worker/routes/plans.ts'
test('usage warning starts at 80 percent and excess remains full',()=>{
 assert.equal(quotaLevel(19,25),'normal');assert.equal(quotaLevel(20,25),'warning');assert.equal(quotaLevel(25,25),'full');assert.equal(quotaLevel(30,25),'full')
})
test('paid plan simulation is rejected outside explicit local preview and for nonowners',async()=>{
 const user={id:'u',email:'owner@example.com',organizationId:'o',organizationName:'Org',emailVerified:true,role:'owner' as const}
 const db={} as Parameters<typeof plans>[1]
 for(const [url,env] of [['https://public.example/api/plans',{EMAIL_MODE:'preview'}],['http://localhost/api/plans',{}]] as const)await assert.rejects(()=>plans(new Request(url,{method:'PATCH'}),db,user,env),/solo están disponibles/)
 await assert.rejects(()=>plans(new Request('http://localhost/api/plans'),db,{...user,role:'viewer'},{EMAIL_MODE:'preview'}),/Solo el propietario/)
})
