import { createHash,randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base,testAccount } from './auth-client.mjs'
import { codeFor } from './mfa-client.mjs'
import { chromium } from 'playwright'
if(process.env.QUOTER_ADMIN_ISOLATED!=='1'||!process.env.QUOTER_IMPORT_STATE||!process.env.QUOTER_TEST_URL)throw new Error('MFA tests require isolated local state and QUOTER_ADMIN_ISOLATED=1')
assert.notEqual(resolve(process.env.QUOTER_IMPORT_STATE),resolve('.wrangler/state'))
function operator(args){const result=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(result.status,0,'Isolated operator command failed')}
function execute(sql){operator([resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--persist-to',process.env.QUOTER_IMPORT_STATE,'--command',sql,'--json'])}
async function call(user,path,data,status=200){const response=await user.request(base+'/api'+path,data===undefined?{}:{method:'POST',body:JSON.stringify(data)});assert.equal(response.status,status,await response.clone().text());return response.json()}
const master=await testAccount(),other=await testAccount();operator(['scripts/admin-master.mjs','--email',master.email])
await call(other,'/security/admin-mfa',undefined,403);await call(other,'/security/admin-mfa',{action:'setup',currentPassword:other.password},403)
await call(master,'/admin/overview',undefined,403);await call(master,'/admin/businesses',undefined,403)
assert.deepEqual(await call(master,'/security/admin-mfa'),{enabled:false,verified:false,verifiedUntil:null,configured:true})
await call(master,'/security/admin-mfa',{action:'setup',currentPassword:'wrong'},403)
let setup=await call(master,'/security/admin-mfa',{action:'setup',currentPassword:master.password});assert.match(setup.secret,/^[A-Z2-7]{32}$/);assert.ok(setup.uri.startsWith('otpauth://totp/'))
await call(master,'/security/admin-mfa',{action:'confirm',currentPassword:master.password,code:'invalid'},403)
const confirmed=await call(master,'/security/admin-mfa',{action:'confirm',currentPassword:master.password,code:codeFor(setup.secret)});assert.equal(confirmed.recoveryCodes.length,8);assert.equal(new Set(confirmed.recoveryCodes).size,8)
await call(master,'/admin/overview');await call(master,'/security/admin-mfa',{action:'setup',currentPassword:master.password},409)
await call(master,'/security/admin-mfa',{action:'verify',code:codeFor(setup.secret)},403)
const login=await call(master,'/auth/login',{email:master.email,password:master.password});assert.ok(login.id);await call(master,'/admin/overview',undefined,403)
const attempts=await Promise.all([master.request(base+'/api/security/admin-mfa',{method:'POST',body:JSON.stringify({action:'verify',code:confirmed.recoveryCodes[0]})}),master.request(base+'/api/security/admin-mfa',{method:'POST',body:JSON.stringify({action:'verify',code:confirmed.recoveryCodes[0]})})]);assert.equal(attempts.filter(x=>x.status===200).length,1);assert.ok(attempts.filter(x=>x.status!==200).every(x=>[401,403].includes(x.status)));await call(master,'/admin/overview')
const backup=JSON.stringify(await call(master,'/backups/export'));assert.ok(!backup.includes(setup.secret));for(const code of confirmed.recoveryCodes)assert.ok(!backup.includes(code));assert.ok(!backup.includes('sealed_secret'))
execute(`UPDATE sessions SET mfa_verified_until=0 WHERE user_id='${master.user.id}'`);await call(master,'/admin/overview',undefined,403);assert.equal((await call(master,'/security/admin-mfa')).verified,false)
// The database guard also rejects a write after the factor expires.
const hash=createHash('sha256').update(master.cookie().split('=')[1]).digest('hex')
const rejected=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--persist-to',process.env.QUOTER_IMPORT_STATE,'--command',`INSERT INTO request_write_guards(id,token_hash,user_id,organization_id,scope) VALUES('${randomUUID()}','${hash}','${master.user.id}','${master.user.organizationId}',3)`,'--json'],{encoding:'utf8'})
assert.notEqual(rejected.status,0);assert.ok((rejected.stdout+rejected.stderr).includes('QUOTER_MFA_REQUIRED'))
// Valid password alone cannot bypass the transactional MFA check.
await call(master,'/admin/businesses/'+other.user.organizationId,{enabled:false,currentPassword:master.password},403)
await call(master,'/security/admin-mfa',{action:'verify',code:confirmed.recoveryCodes[1]});await call(master,'/admin/overview')
if(process.env.QUOTER_BROWSER_PATH){const browser=await chromium.launch({executablePath:process.env.QUOTER_BROWSER_PATH,headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(master.email);await page.getByLabel('Contraseña',{exact:true}).fill(master.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Protege Administración'}).waitFor();await page.getByLabel('Código de autenticación o recuperación').fill(confirmed.recoveryCodes[2]);await page.getByRole('button',{name:'Verificar acceso',exact:true}).click();await page.getByRole('heading',{name:'Administración',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}finally{await browser.close()}}
operator(['scripts/reset-admin-mfa.mjs','--email',other.email]);await call(master,'/admin/overview')
operator(['scripts/reset-admin-mfa.mjs','--email',master.email]);await call(master,'/auth/me',undefined,401)
await call(master,'/auth/login',{email:master.email,password:master.password});assert.equal((await call(master,'/security/admin-mfa')).enabled,false);await call(master,'/admin/overview',undefined,403)
if(process.env.QUOTER_BROWSER_PATH){
 const browser=await chromium.launch({executablePath:process.env.QUOTER_BROWSER_PATH,headless:true})
 try{const page=await browser.newPage({viewport:{width:320,height:844}});await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(master.email);await page.getByLabel('Contraseña',{exact:true}).fill(master.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Protege Administración'}).waitFor();await page.getByLabel('Contraseña actual',{exact:true}).fill(master.password);await page.getByRole('button',{name:'Configurar autenticador'}).click();const secret=page.locator('.mfa-panel code');await secret.waitFor();await page.getByLabel('Código de autenticación o recuperación').fill(codeFor(await secret.innerText()));await page.getByRole('button',{name:'Confirmar segundo factor'}).click();await page.getByRole('heading',{name:'Guarda tus códigos de recuperación'}).waitFor();const codes=await page.locator('.mfa-panel li code').allTextContents();assert.equal(codes.length,8);for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))};await page.getByRole('button',{name:'Ya guardé los códigos'}).click();await page.getByRole('heading',{name:'Administración',exact:true}).waitFor();await call(master,'/admin/overview',undefined,403);await call(master,'/security/admin-mfa',{action:'verify',code:codes[0]});await call(master,'/admin/overview')}finally{await browser.close()}
}else{setup=await call(master,'/security/admin-mfa',{action:'setup',currentPassword:master.password});await call(master,'/security/admin-mfa',{action:'confirm',currentPassword:master.password,code:codeFor(setup.secret)});await call(master,'/admin/overview')}

assert.ok((await call(master,'/admin/history')).rows.some(row=>row.action==='mfa.reset'))
console.log('MFA passed: mandatory enrollment, password proof, TOTP replay rejection, atomic one-use recovery, session/expiry isolation, backup privacy, operator reset and mobile challenge.')
