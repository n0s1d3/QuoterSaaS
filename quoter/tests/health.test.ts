import { test } from 'node:test'
import assert from 'node:assert/strict'
import { health } from '../worker/routes/health.ts'
const env={PASSWORD_PEPPER:'ab'.repeat(32),MFA_ENCRYPTION_KEY:'cd'.repeat(32),TURNSTILE_SITE_KEY:'public',TURNSTILE_SECRET_KEY:'private',RESEND_API_KEY:'private',MAIL_FROM:'Quoter <sender@example.com>',APP_URL:'https://quoter.example'}
function database(state:unknown){return {prepare(){return {first:async()=>state}}} as unknown as D1Database}
test('readiness checks schema and configuration without returning diagnostic or tenant contents',async()=>{
 const request=new Request('https://quoter.example/api/health')
 assert.deepEqual(await(await health(request,database({migrated:1,guards:4}),env)).json(),{status:'ok'})
 for(const [db,config] of [[undefined,env],[database({migrated:0,guards:4}),env],[database({migrated:1,guards:2}),env],[database({migrated:1,guards:4}),{...env,PASSWORD_PEPPER:undefined}],[database({migrated:1,guards:4}),{...env,TURNSTILE_SECRET_KEY:undefined}],[database({migrated:1,guards:4}),{...env,APP_URL:'https://wrong.example'}]] as const){const response=await health(request,db,config);assert.equal(response.status,503);assert.deepEqual(await response.json(),{status:'unavailable'})}
 assert.equal((await health(new Request(request,{method:'POST'}),database({}),env)).status,405)
})
