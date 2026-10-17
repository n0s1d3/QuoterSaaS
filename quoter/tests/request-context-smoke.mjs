import assert from 'node:assert/strict'
// Test the same bundled entrypoint deployed to Workers; run npm run build first.
import worker from '../dist/quoter/index.js'
const context={waitUntil(){},passThroughOnException(){}}
const logs=[],original=console.error
console.error=(...values)=>logs.push(values)
try{
 const env={DB:{prepare(){throw new Error('PRIVATE_SQL PRIVATE_CUSTOMER')}},EMAIL_MODE:'preview',PASSWORD_PEPPER:'ab'.repeat(32)}
 const request=()=>new Request('https://app.example/api/auth/me',{headers:{Cookie:'__Host-quoter_session='+'ab'.repeat(32),'X-Request-ID':'attacker-controlled-value'}})
 const response=await worker.fetch(request(),env,context),payload=await response.json(),id=response.headers.get('X-Request-ID')
 assert.equal(response.status,500);assert.match(id,/^[a-f0-9-]{36}$/);assert.equal(payload.requestId,id);assert.equal(logs[0][1].requestId,id)
 assert.ok(!JSON.stringify(payload).includes('PRIVATE_'));assert.ok(!JSON.stringify(logs).includes('PRIVATE_'))
 const next=await worker.fetch(request(),env,context);assert.notEqual(next.headers.get('X-Request-ID'),id)
 const unauthorized=await worker.fetch(new Request('https://app.example/api/auth/me'),env,context);assert.equal(unauthorized.status,401);assert.match(unauthorized.headers.get('X-Request-ID'),/^[a-f0-9-]{36}$/)
 const maintenance=await worker.fetch(new Request('https://app.example/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{...env,MAINTENANCE_READ_ONLY:'true'},context)
 assert.equal(maintenance.status,503);assert.equal((await maintenance.json()).code,'MAINTENANCE_READ_ONLY');assert.match(maintenance.headers.get('X-Request-ID'),/^[a-f0-9-]{36}$/)
 const login=await worker.fetch(new Request('http://localhost:5173/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.com',password:'test-password'})}),{...env,MAINTENANCE_READ_ONLY:'true'},context)
 assert.equal(login.status,500);assert.notEqual((await login.json()).code,'MAINTENANCE_READ_ONLY')
 console.log('Request context passed: response/log correlation, server-generated unique IDs, private error redaction, maintenance business-write rejection and access preservation.')
}finally{console.error=original}
