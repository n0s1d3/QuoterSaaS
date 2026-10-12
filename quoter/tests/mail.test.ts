import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mailReady,sendAccountEmail } from '../worker/auth/mail.ts'
test('preview email is restricted to explicit local mode',async()=>{
 const result=await sendAccountEmail(new Request('http://localhost:5173/api/auth/register'),{EMAIL_MODE:'preview'},'test@example.com','verify','testtoken')
 assert.equal(result.emailDelivery,'preview');assert.ok(result.previewUrl?.endsWith('/account/verify#token=testtoken'))
 assert.throws(()=>mailReady(new Request('https://public.example/api/auth/register'),{EMAIL_MODE:'preview'}))
 assert.throws(()=>mailReady(new Request('http://localhost:5173/'),{}))
})
test('Resend adapter uses fixed configured origin and sends the expected message',async()=>{
 const original=globalThis.fetch
 let calls=0
 globalThis.fetch=async(input,init)=>{
  calls++;assert.equal(input,'https://api.resend.com/emails')
  const payload=JSON.parse(init?.body as string)
  assert.deepEqual(payload.to,['test@example.com']);assert.equal(payload.from,'Quoter <accounts@example.com>')
  assert.ok(payload.text.includes('https://app.example/account/reset#token=testtoken'))
  assert.ok(!payload.text.includes('untrusted.example'))
  return new Response('{}',{status:200})
 }
 try {const result=await sendAccountEmail(new Request('https://untrusted.example/api/auth/forgot-password'),{RESEND_API_KEY:'test-only-placeholder',MAIL_FROM:'Quoter <accounts@example.com>',APP_URL:'https://app.example'},'test@example.com','reset','testtoken');assert.equal(result.emailDelivery,'sent');assert.ok(!('previewUrl' in result));assert.equal(calls,1)}finally{globalThis.fetch=original}
})
