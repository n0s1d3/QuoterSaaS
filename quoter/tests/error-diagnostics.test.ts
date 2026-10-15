import { test } from 'node:test'
import assert from 'node:assert/strict'
import { errorDiagnostic } from '../worker/error-diagnostics.ts'
test('backend failure categories identify schema, bindings and crypto without exposing raw error content',()=>{
 assert.deepEqual(errorDiagnostic(new Error('D1_ERROR: no such table: users')),{category:'database_schema',component:'users'})
 assert.deepEqual(errorDiagnostic(new Error('no such column: mfa_verified_until')),{category:'database_schema',component:'mfa_verified_until'})
 assert.deepEqual(errorDiagnostic(new Error('no such table: customer_private_name')),{category:'database_schema'})
 assert.deepEqual(errorDiagnostic(new Error("Cannot read properties of undefined (reading 'prepare')")),{category:'database_binding'})
 assert.deepEqual(errorDiagnostic(new Error('PBKDF2 iterations unsupported')),{category:'crypto_runtime'})
 const detail=errorDiagnostic(new Error('D1_ERROR: SELECT password_hash FROM users; secret@example.com; PRIVATE_PASSWORD'))
 assert.deepEqual(detail,{category:'database_failure'});assert.ok(!JSON.stringify(detail).includes('PRIVATE_PASSWORD'));assert.ok(!JSON.stringify(detail).includes('secret@example.com'))
})
