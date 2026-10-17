import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
export const base=process.env.QUOTER_TEST_URL||'http://127.0.0.1:5173'
export async function assertLocalPreview(){
 if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('Account tests run only against local preview servers')
 const options=await(await fetch(base+'/api/auth/email-options')).json()
 if(!options.preview)throw new Error('Tests require EMAIL_MODE=preview before creating any test account')
}
export async function testAccount() {
 await assertLocalPreview()
 const testHeaders=process.env.QUOTER_TEST_IP?{'CF-Connecting-IP':process.env.QUOTER_TEST_IP}:{}
 const email=`test-${randomUUID()}@example.com`,password=`${randomUUID()}A!`
 const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json',...testHeaders},body:JSON.stringify({email,password,confirmPassword:password,businessName:'Test business'})})
 assert.equal(response.status,201,await response.clone().text())
 let cookie=response.headers.get('set-cookie').split(';')[0]
 const registered=await response.json()
 if(!registered.previewUrl)throw new Error('Tests require local email preview: copy .dev.vars.example to .dev.vars and restart Vite')
 const token=new URLSearchParams(new URL(registered.previewUrl).hash.slice(1)).get('token')
 const verified=await fetch(base+'/api/auth/verify-email',{method:'POST',headers:{'content-type':'application/json',Cookie:cookie,...testHeaders},body:JSON.stringify({token,password})})
 assert.equal(verified.status,200,await verified.clone().text())
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',...testHeaders},body:JSON.stringify({email,password})});assert.equal(login.status,200,await login.clone().text());cookie=login.headers.get('set-cookie').split(';')[0]
 const user=await(await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json()
 async function request(url,options={}) {const headers=new Headers(options.headers);headers.set('Cookie',cookie);if(process.env.QUOTER_TEST_IP)headers.set('CF-Connecting-IP',process.env.QUOTER_TEST_IP);if(options.method&&options.method!=='GET')headers.set('Content-Type','application/json');const response=await fetch(url,{...options,headers});const changed=response.headers.get('set-cookie');if(changed)cookie=changed.split(';')[0];return response}
 return {email,password,user,request,cookie:()=>cookie}
}
