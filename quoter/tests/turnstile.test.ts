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
  globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal((init!.body as FormData).get('secret'),'secret');assert.equal(init!.redirect,'manual');return Response.json(proof)}
  await challenge(request,env,'proof','quoter_register');proof={...proof,action:'quoter_recovery'};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'));proof={...proof,action:'quoter_register',hostname:'evil.example'};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'));proof={...proof,hostname:'quoter.example',success:false};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'))
  globalThis.fetch=async()=>{throw new Error('network')};await assert.rejects(()=>challenge(request,env,'proof','quoter_register'),e=>(e as {status:number}).status===503)
 }finally{globalThis.fetch=original}
})

test('Workers-compatible verification rejects redirects without following or leaking secrets',async()=>{
 const original=globalThis.fetch,logger=console.error,logs:unknown[][]=[];console.error=(...values)=>{logs.push(values)}
 try{
  let calls=0;globalThis.fetch=async(_input,init)=>{calls++;assert.equal(init!.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}})}
  const request=new Request('https://quoter.example/api/auth/register'),env={TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'PRIVATE_SECRET'}
  await assert.rejects(()=>challenge(request,env,'PRIVATE_TOKEN','quoter_register'),e=>(e as {status:number}).status===503);assert.equal(calls,1)
  globalThis.fetch=async()=>{throw new Error('PRIVATE_SECRET PRIVATE_TOKEN')}
  await assert.rejects(()=>challenge(request,env,'PRIVATE_TOKEN','quoter_register'))
  const output=JSON.stringify(logs);assert.ok(!output.includes('PRIVATE_SECRET'));assert.ok(!output.includes('PRIVATE_TOKEN'));assert.ok(output.includes('http'));assert.ok(output.includes('request'))
 }finally{globalThis.fetch=original;console.error=logger}
})
