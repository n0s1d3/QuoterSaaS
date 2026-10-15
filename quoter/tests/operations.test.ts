import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
// @ts-ignore Node runs the JS operator modules directly.
import { backupKey,encryptSnapshot,decryptSnapshot } from '../scripts/lib/recovery.mjs'
// @ts-ignore Node runs the JS operator modules directly.
import { checkProduction } from '../scripts/check-production.mjs'
test('encrypted snapshots preserve data, reuse private key and reject corruption/wrong keys',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'quoter-recovery-unit-'));try{const keyFile=join(folder,'key'),key=backupKey(keyFile,{create:true});assert.deepEqual(key,backupKey(keyFile,{create:true}));const sql=join(folder,'source.sql'),snapshot=join(folder,'backup.qdb');writeFileSync(sql,'CREATE TABLE private(value TEXT); INSERT INTO private VALUES (\'PRIVATE_CUSTOMER\');');await encryptSnapshot(sql,snapshot,key);assert.ok(!readFileSync(snapshot).includes(Buffer.from('PRIVATE_CUSTOMER')));const restored=join(folder,'restored.sql');await decryptSnapshot(snapshot,restored,key);assert.deepEqual(readFileSync(sql),readFileSync(restored));await assert.rejects(()=>decryptSnapshot(snapshot,join(folder,'wrong.sql'),randomBytes(32)));const changed=readFileSync(snapshot);changed[changed.length-1]^=1;writeFileSync(join(folder,'tampered.qdb'),changed);await assert.rejects(()=>decryptSnapshot(join(folder,'tampered.qdb'),join(folder,'tampered.sql'),key));writeFileSync(join(folder,'truncated.qdb'),changed.subarray(0,8));await assert.rejects(()=>decryptSnapshot(join(folder,'truncated.qdb'),join(folder,'truncated.sql'),key));await assert.rejects(()=>encryptSnapshot(sql,snapshot,key))}finally{rmSync(folder,{recursive:true,force:true})}
})
test('production checks are anonymous GETs and detect preview, schema failure and public data access',async()=>{
 const request=async(input:URL,options:RequestInit)=>{assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');const path=input.pathname
 if(path==='/')return new Response('<html></html>',{headers:{'content-type':'text/html','content-security-policy':"script-src 'self'; frame-ancestors 'none'; object-src 'none'",'x-content-type-options':'nosniff','strict-transport-security':'max-age=31536000'}})
 if(path==='/api/health')return Response.json({status:'ok'},{headers:{'cache-control':'no-store'}})
 if(path.endsWith('security-options'))return Response.json({required:true,siteKey:'public'})
 if(path.endsWith('email-options'))return Response.json({preview:false})
 return Response.json({error:'login required'},{status:401,headers:{'cache-control':'no-store'}})}
 assert.equal((await checkProduction('https://quoter.example',request)).ok,true)
 assert.equal((await checkProduction('https://quoter.example',async(input:URL,options:RequestInit)=>input.pathname==='/api/quotes'?Response.json({private:'should never be inspected'}):request(input,options))).ok,false)
 assert.equal((await checkProduction('https://quoter.example',async()=>new Response(null,{status:503}))).ok,false)
 await assert.rejects(()=>checkProduction('http://quoter.example',request))
})
