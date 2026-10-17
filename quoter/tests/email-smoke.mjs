import assert from 'node:assert/strict'
import { randomUUID,createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base,testAccount,assertLocalPreview } from './auth-client.mjs'
await assertLocalPreview()
const tokenOf=url=>new URLSearchParams(new URL(url).hash.slice(1)).get('token')
async function raw(path,data,cookie){return fetch(base+'/api'+path,{method:'POST',headers:{'content-type':'application/json',...(process.env.QUOTER_TEST_IP?{'CF-Connecting-IP':process.env.QUOTER_TEST_IP}:{}),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)})}
const email='email-'+randomUUID()+'@example.com',password=randomUUID()+'Aa!'
const registration=await raw('/auth/register',{email,password,confirmPassword:password,businessName:'Email test'})
assert.equal(registration.status,201);const cookie=registration.headers.get('set-cookie').split(';')[0],registered=await registration.json()
assert.ok(registered.previewUrl,'Copy .dev.vars.example to .dev.vars and restart Vite for local preview')
assert.equal(registered.emailVerified,false)
assert.equal((await fetch(base+'/api/quotes',{headers:{Cookie:cookie}})).status,403)
const verification=tokenOf(registered.previewUrl)
assert.equal((await raw('/auth/reset-password',{token:verification,password:randomUUID()+'Aa!'})).status,400)
assert.equal((await raw('/auth/verify-email',{token:verification})).status,400)
assert.equal((await raw('/auth/verify-email',{token:verification,password:'Incorrect-registration-password'})).status,403)
assert.equal((await fetch(base+'/api/quotes',{headers:{Cookie:cookie}})).status,403)
const concurrent=await Promise.all([raw('/auth/verify-email',{token:verification,password}),raw('/auth/verify-email',{token:verification,password})])
assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400])
assert.equal((await fetch(base+'/api/quotes',{headers:{Cookie:cookie}})).status,401)
assert.equal((await raw('/auth/verify-email',{token:verification,password})).status,400)
const otherSession=await raw('/auth/login',{email,password}),otherCookie=otherSession.headers.get('set-cookie').split(';')[0]
const first=await(await raw('/auth/forgot-password',{email})).json(),second=await(await raw('/auth/forgot-password',{email})).json()
assert.ok(first.previewUrl&&second.previewUrl)
assert.equal((await raw('/auth/reset-password',{token:tokenOf(first.previewUrl),password:'short'})).status,400)
const replacement=randomUUID()+'Bb!'
const resetToken=tokenOf(second.previewUrl)
const resets=await Promise.all([raw('/auth/reset-password',{token:resetToken,password:replacement}),raw('/auth/reset-password',{token:resetToken,password:replacement})])
assert.deepEqual(resets.map(r=>r.status).sort(),[200,400])
for(const old of [cookie,otherCookie])assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:old}})).status,401)
assert.equal((await raw('/auth/reset-password',{token:tokenOf(first.previewUrl),password:replacement})).status,400)
assert.equal((await raw('/auth/login',{email,password})).status,401)
assert.equal((await raw('/auth/login',{email,password:replacement})).status,200)
const nonexistent=await(await raw('/auth/forgot-password',{email:'missing-'+randomUUID()+'@example.com'})).json()
assert.equal(nonexistent.message,first.message)
const expired=await(await raw('/auth/forgot-password',{email})).json(),expiredToken=tokenOf(expired.previewUrl)
const digest=createHash('sha256').update(expiredToken).digest('hex')
execFileSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local',...(process.env.QUOTER_IMPORT_STATE?['--persist-to',process.env.QUOTER_IMPORT_STATE]:[]),'--command',`UPDATE account_tokens SET expires_at=0 WHERE token_hash='${digest}'`,'--json'],{stdio:['ignore','pipe','pipe']})
assert.equal((await raw('/auth/reset-password',{token:expiredToken,password:replacement})).status,400)
const verified=await testAccount()
assert.equal((await raw('/auth/resend-verification',{},verified.cookie())).status,200)
console.log('Email recovery passed: verification gate, concurrent single-use tokens, purpose validation, expiry, old-link invalidation, all-session revocation and new-password login.')
