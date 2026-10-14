import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newPasswordHash,verifyPassword,legacyPasswordHash } from '../worker/auth/passwords.ts'
import { passwordHash } from '../worker/auth/session.ts'
test('versioned passwords use 600000 iterations, preserve legacy verification and bound accepted formats',async()=>{
 const password='A-long-test-password!',salt='ab'.repeat(32),old=await passwordHash(password,salt),current=await newPasswordHash(password,salt)
 assert.ok(legacyPasswordHash(old));assert.match(current,/^pbkdf2-sha256\$600000\$[a-f0-9]{64}$/);assert.ok(await verifyPassword(password,salt,old));assert.ok(await verifyPassword(password,salt,current));assert.ok(!await verifyPassword('wrong',salt,current));assert.ok(!await verifyPassword(password,salt,'pbkdf2-sha256$999999999$'+'0'.repeat(64)))
})
