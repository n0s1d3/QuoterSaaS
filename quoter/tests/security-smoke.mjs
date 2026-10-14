import assert from 'node:assert/strict'
import { createHash,randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount(),other=await testAccount(),editor=await testAccount(),org=owner.user.organizationId
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,...(status===413?{headers:{Connection:'close'}}:{}),body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
const state=process.env.QUOTER_IMPORT_STATE?['--persist-to',process.env.QUOTER_IMPORT_STATE]:[]
const execute=sql=>spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local',...state,'--command',sql,'--json'],{encoding:'utf8'})
await call(owner,'/plans',{planId:'pro'},'PATCH')
const injection="Robert'); DROP TABLE customers; --",xss='<img src=x onerror="window.securityXss=true">'
const customer=await call(owner,'/customers',{name:injection},'POST',201),input={customerId:customer.id,issueDate:'2026-10-14',notes:xss,items:[{description:injection,quantity:1,unitPrice:100}]},quote=await call(owner,'/quotes',input,'POST',201)
assert.equal((await call(owner,'/customers'))[0].name,injection);assert.equal((await call(owner,'/quotes/'+quote.id)).notes,xss)
await call(other,'/quotes/'+quote.id,undefined,'GET',404);await call(owner,'/quotes/'+encodeURIComponent("' OR 1=1 --"),undefined,'GET',404)
const search=await call(owner,'/quotes?paged=true&search='+encodeURIComponent("' OR 1=1 --"));assert.equal(search.total,0)
await call(other,'/quotes',{...input,customerId:customer.id},'POST',400)
let r=await owner.request(base+'/api/customers',{method:'POST',headers:{'Sec-Fetch-Site':'cross-site'},body:JSON.stringify({name:'Cross-site'})});assert.equal(r.status,403)
await call(owner,'/auth/login',{email:owner.email,password:owner.password,junk:'x'.repeat(17000)},'POST',413)
await call(owner,'/customers',{name:'Valid',junk:'x'.repeat(1200000)},'POST',413)
const chunked=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify({name:'Valid',junk:'x'.repeat(1200000)})));controller.close()}})
r=await owner.request(base+'/api/customers',{method:'POST',headers:{Connection:'close'},body:chunked,duplex:'half'});assert.equal(r.status,413)
const invite=await call(owner,'/team/invitations',{email:editor.email,role:'editor'},'POST',201),token=new URLSearchParams(new URL(invite.previewUrl).hash.slice(1)).get('token');await call(editor,'/invitations/accept',{token})
await call(editor,'/quotes/'+quote.id,{status:'sent'},'PATCH');await call(owner,'/team/members/'+editor.user.id,{role:'viewer'},'PATCH')
const hash=createHash('sha256').update(editor.cookie().split('=')[1]).digest('hex')
const guard=(scope)=>`INSERT INTO request_write_guards(id,token_hash,user_id,organization_id,scope) VALUES('${randomUUID()}','${hash}','${editor.user.id}','${org}',${scope}); UPDATE quotes SET notes='UNAUTHORIZED_CHANGE' WHERE id='${quote.id}';`
let result=execute(guard(1));assert.notEqual(result.status,0);assert.ok((result.stderr+result.stdout).includes('QUOTER_ACCESS_CHANGED'));assert.equal((await call(owner,'/quotes/'+quote.id)).notes,xss)
result=execute(`UPDATE users SET suspended_at=CURRENT_TIMESTAMP WHERE id='${editor.user.id}'; DELETE FROM sessions WHERE user_id='${editor.user.id}';`);assert.equal(result.status,0,result.stderr+result.stdout)
result=execute(guard(0));assert.notEqual(result.status,0);assert.ok((result.stderr+result.stdout).includes('QUOTER_SESSION_REVOKED'));assert.equal((await call(owner,'/quotes/'+quote.id)).notes,xss)
result=execute('SELECT COUNT(*) AS count FROM request_write_guards');assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).flatMap(entry=>entry.results||[])[0].count,0)
const backup=await call(owner,'/backups/export');assert.ok(!Object.hasOwn(backup,'users'));assert.ok(!JSON.stringify(backup).includes(owner.password));assert.ok(!JSON.stringify(backup).includes('password_hash'))
if(process.env.QUOTER_BROWSER_PATH){
 const root=await fetch(base);assert.ok(root.headers.get('Content-Security-Policy')?.includes("script-src 'self'"));assert.equal(root.headers.get('X-Frame-Options'),'DENY');assert.equal(root.headers.get('X-Content-Type-Options'),'nosniff')
 const browser=await chromium.launch({executablePath:process.env.QUOTER_BROWSER_PATH,headless:true})
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(owner.email);await page.getByLabel('Contraseña',{exact:true}).fill(owner.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Resumen',exact:true}).waitFor();await page.goto(base+'/quotes/'+quote.id);await page.getByRole('heading',{name:quote.quoteNumber,exact:true}).waitFor();assert.equal(await page.locator('.notes').last().innerText(),xss);assert.equal(await page.locator('.notes img').count(),0);assert.equal(await page.evaluate(()=>window.securityXss),undefined);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.pdf'));assert.deepEqual(errors,[])}finally{await browser.close()}
}
console.log('Security passed: SQL payload literals, tenant IDOR isolation, cross-site rejection, byte/stream limits, atomic revoked-role/session guards, secret-free backups, CSP/XSS and PDF compatibility.')
