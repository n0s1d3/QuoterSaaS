import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
export const base=process.env.QUOTER_TEST_URL||'http://127.0.0.1:5173'
export async function testAccount() {
 const email=`test-${randomUUID()}@example.com`,password=`${randomUUID()}A!`
 const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,businessName:'Test business'})})
 assert.equal(response.status,201,await response.clone().text())
 let cookie=response.headers.get('set-cookie').split(';')[0]
 const registered=await response.json()
 if(!registered.previewUrl)throw new Error('Tests require local email preview: copy .dev.vars.example to .dev.vars and restart Vite')
 const token=new URLSearchParams(new URL(registered.previewUrl).hash.slice(1)).get('token')
 const verified=await fetch(base+'/api/auth/verify-email',{method:'POST',headers:{'content-type':'application/json',Cookie:cookie},body:JSON.stringify({token})})
 assert.equal(verified.status,200,await verified.clone().text())
 const user=await(await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json()
 async function request(url,options={}) {const headers=new Headers(options.headers);headers.set('Cookie',cookie);if(options.method&&options.method!=='GET')headers.set('Content-Type','application/json');const response=await fetch(url,{...options,headers});const changed=response.headers.get('set-cookie');if(changed)cookie=changed.split(';')[0];return response}
 return {email,password,user,request,cookie:()=>cookie}
}
