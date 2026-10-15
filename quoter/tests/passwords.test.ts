import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newPasswordHash,verifyPassword,legacyPasswordHash,needsPasswordUpgrade } from '../worker/auth/passwords.ts'
import { passwordHash } from '../worker/auth/session.ts'
const env={PASSWORD_PEPPER:'ab'.repeat(32)}
test('peppered passwords preserve old formats and reject wrong password or pepper',async()=>{
 const password='A-long-test-password!',salt='cd'.repeat(32),old=await passwordHash(password,salt),previous='pbkdf2-sha256$600000$'+await passwordHash(password,salt,600000),current=await newPasswordHash(password,salt,env)
 assert.ok(legacyPasswordHash(old));assert.ok(needsPasswordUpgrade(previous));assert.ok(!needsPasswordUpgrade(current));assert.match(current,/^pbkdf2-sha256-peppered\$100000\$v1\$[a-f0-9]{64}$/)
 assert.ok(await verifyPassword(password,salt,old,env));assert.ok(await verifyPassword(password,salt,previous,env));assert.ok(await verifyPassword(password,salt,current,env));assert.ok(!await verifyPassword('wrong',salt,current,env));assert.ok(!await verifyPassword(password,salt,current,{PASSWORD_PEPPER:'ef'.repeat(32)}));assert.ok(!await verifyPassword(password,salt,'pbkdf2-sha256$999999999$'+'0'.repeat(64),env))
})
test('registration works under a native 100000-iteration cap and missing pepper fails closed',async()=>{
 const native=crypto.subtle.deriveBits.bind(crypto.subtle),original=crypto.subtle.deriveBits
 crypto.subtle.deriveBits=async(algorithm,key,length)=>{if(typeof algorithm==='object'&&(algorithm as Pbkdf2Params).iterations>100000)throw new Error('PBKDF2 iteration counts above 100000 unsupported');return native(algorithm,key,length)}
 try{const stored=await newPasswordHash('Strong-password!', 'salt',env);assert.ok(await verifyPassword('Strong-password!','salt',stored,env));await assert.rejects(()=>verifyPassword('x','salt','pbkdf2-sha256$600000$'+'0'.repeat(64),env),e=>(e as {status:number}).status===503)}finally{crypto.subtle.deriveBits=original}
 await assert.rejects(()=>newPasswordHash('Strong-password!','salt'),e=>(e as {status:number}).status===503)
})
