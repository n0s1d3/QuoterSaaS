import { test } from 'node:test'
import assert from 'node:assert/strict'
import { api, ApiError, setApiContext } from '../src/lib/api.ts'
import { confirmNavigation, registerNavigationBlocker } from '../src/lib/navigation-guard.ts'

test('API keeps HTTP and support references without exposing HTML responses', async () => {
 const originalFetch=globalThis.fetch, originalWindow=globalThis.window
 const events=new EventTarget()
 Object.assign(globalThis,{window:events})
 try {
  globalThis.fetch=async()=>new Response('<html>PRIVATE_PROXY_CONTENT</html>',{status:502,headers:{'Content-Type':'text/html','X-Request-ID':'safe-reference'}})
  await assert.rejects(api('/quotes'),error=>error instanceof ApiError&&error.status===502&&error.requestId==='safe-reference'&&error.message.includes('safe-reference')&&!error.message.includes('PRIVATE_PROXY'))
  globalThis.fetch=async()=>new Response('{not-json',{status:200,headers:{'Content-Type':'application/json'}})
  await assert.rejects(api('/quotes'),error=>error instanceof ApiError&&error.code==='INVALID_RESPONSE')
  globalThis.fetch=async()=>Response.json({error:'Completa la verificación de seguridad',code:'LOGIN_CHALLENGE_REQUIRED',challengeRequired:true},{status:403})
  await assert.rejects(api('/auth/login',{email:'test@example.com',password:'never-log'}),error=>error instanceof ApiError&&error.challengeRequired&&error.code==='LOGIN_CHALLENGE_REQUIRED')
 } finally {globalThis.fetch=originalFetch;Object.assign(globalThis,{window:originalWindow})}
})

test('API times out and cancels without retrying writes',async()=>{
 const originalFetch=globalThis.fetch
 let attempts=0
 try{
  globalThis.fetch=(_url,options)=>{attempts++;return new Promise((_resolve,reject)=>{options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});if(options?.signal?.aborted)reject(new DOMException('Aborted','AbortError'))})}
  await assert.rejects(api('/quotes',{notes:'private'},'POST',{timeoutMs:5}),error=>error instanceof ApiError&&error.code==='REQUEST_TIMEOUT')
  assert.equal(attempts,1)
  const controller=new AbortController();controller.abort()
  await assert.rejects(api('/quotes',undefined,'GET',{signal:controller.signal}),error=>error instanceof ApiError&&error.code==='REQUEST_CANCELLED')
  assert.equal(attempts,2)
 }finally{globalThis.fetch=originalFetch;setApiContext(null)}
})

test('Unsaved changes protect navigation and reload without browser persistence',()=>{
 const originalWindow=globalThis.window,events=new EventTarget()
 let dirty=true,confirmed=false,prompts=0
 Object.assign(globalThis,{window:{addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),confirm:()=>{prompts++;return confirmed}}})
 try{
  const unregister=registerNavigationBlocker(()=>dirty)
  assert.equal(confirmNavigation(),false)
  const unload=new Event('beforeunload',{cancelable:true});events.dispatchEvent(unload);assert.equal(unload.defaultPrevented,true)
  confirmed=true;assert.equal(confirmNavigation(),true)
  dirty=false;assert.equal(confirmNavigation(),true);assert.equal(prompts,2)
  unregister();dirty=true;assert.equal(confirmNavigation(),true)
  const cleanUnload=new Event('beforeunload',{cancelable:true});events.dispatchEvent(cleanUnload);assert.equal(cleanUnload.defaultPrevented,false)
 }finally{Object.assign(globalThis,{window:originalWindow})}
})
