import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundedText,body,guardTransport,text } from '../worker/http.ts'
import { passwordHash,equalHashes,guardMutation } from '../worker/auth/session.ts'
test('passwords use salted, irreversible digests and exact comparison',async()=>{
 const password='Private-password-A!',a=await passwordHash(password,'salt-a'),b=await passwordHash(password,'salt-b')
 assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,password);assert.notEqual(a,b);assert.equal(await passwordHash(password,'salt-a'),a);assert.ok(equalHashes(a,a));assert.ok(!equalHashes(a,b));assert.ok(!equalHashes(a,a+'0'))
})
test('chunked payload limits do not rely on Content-Length and cancel oversized input',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5));controller.enqueue(new Uint8Array(1048600));},cancel(){cancelled=true}})
 const request=new Request('http://localhost/api/quotes',{method:'POST',body:stream,duplex:'half'} as RequestInit)
 await assert.rejects(()=>boundedText(request,6),e=>(e as {status:number}).status===413);assert.ok(cancelled)
 await assert.rejects(()=>body(new Request('http://localhost/api/auth/login',{method:'POST',body:JSON.stringify({junk:'x'.repeat(17000)})})),e=>(e as {status:number}).status===413)
 assert.deepEqual(await body(new Request('http://localhost/api/quotes',{method:'POST',body:JSON.stringify({name:'á'})})),{name:'á'})
 assert.throws(()=>text(' '.repeat(1000)+'x','Nombre',true,200))
})
test('foreign browser mutations and public HTTP API traffic are rejected',()=>{
 assert.throws(()=>guardMutation(new Request('https://quoter.example/api/quotes',{method:'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'}})))
 assert.throws(()=>guardTransport(new Request('http://quoter.example/api/auth/login')))
 guardTransport(new Request('http://127.0.0.1/api/auth/login'));guardTransport(new Request('https://quoter.example/api/auth/login'))
})
