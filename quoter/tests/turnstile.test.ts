import { test } from 'node:test'
import assert from 'node:assert/strict'
import { challenge,challengeOptions,signupDailyLimit } from '../worker/auth/turnstile.ts'
test('public signup fails closed while explicit loopback preview needs no CAPTCHA',async()=>{
 const local=new Request('http://127.0.0.1/api/auth/register'),publicRequest=new Request('https://quoter.example/api/auth/register')
 await challenge(local,{EMAIL_MODE:'preview'},null,'quoter_register');assert.equal(challengeOptions(local,{EMAIL_MODE:'preview'}).required,false)
 await assert.rejects(()=>challenge(publicRequest,{EMAIL_MODE:'preview'},null,'quoter_register'),e=>(e as {status:number}).status===503)
 assert.equal(signupDailyLimit({}),250);assert.equal(signupDailyLimit({SIGNUP_DAILY_LIMIT:'10'}),10);assert.throws(()=>signupDailyLimit({SIGNUP_DAILY_LIMIT:'-1'}))
})
test('Turnstile proof must match action and hostname; provider failures are closed',async()=>{
 const original=globalThis.fetch,request=new Request('https://quoter.example/api/auth/register'),env={TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'}
 try{
  let proof={success:true,hostname:'quoter.example',action:'quoter_register'}
  globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal((init!.body as FormData).get('secret'),'secret');assert.equal(init!.redirect,'error');return Response.json(proof)}
  await challenge(request,env,'proof','quoter_register');proof={...proof,action:'quoter_recovery'};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'));proof={...proof,action:'quoter_register',hostname:'evil.example'};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'));proof={...proof,hostname:'quoter.example',success:false};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'))
  globalThis.fetch=async()=>{throw new Error('network')};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'),e=>(e as {status:number}).status===503)
 }finally{globalThis.fetch=original}
})
