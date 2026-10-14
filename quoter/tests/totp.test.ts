import { test } from 'node:test'
import assert from 'node:assert/strict'
import { base32,totp,validStep,seal,unseal } from '../worker/auth/totp.ts'
test('TOTP follows RFC 6238 SHA1 vectors and rejects reused or expired codes',async()=>{
 const secret=base32(new TextEncoder().encode('12345678901234567890'))
 for(const [time,expected] of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']] as const)assert.equal(await totp(secret,Math.floor(time/30)),expected)
 assert.equal(await validStep(secret,'287082',-1,59000),1);assert.equal(await validStep(secret,'287082',1,59000),null);assert.equal(await validStep(secret,'287082',-1,200000),null)
})
test('MFA secret encryption requires an independent key and is bound to account identity',async()=>{
 const key='ab'.repeat(32),secret='EXAMPLESECRET',encrypted=await seal(secret,'user-a',key)
 assert.ok(!encrypted.includes(secret));assert.equal(await unseal(encrypted,'user-a',key),secret);assert.notEqual(encrypted,await seal(secret,'user-a',key))
 await assert.rejects(()=>unseal(encrypted,'user-b',key));await assert.rejects(()=>unseal(encrypted,'user-a','cd'.repeat(32)));await assert.rejects(()=>seal(secret,'user-a',undefined))
})
