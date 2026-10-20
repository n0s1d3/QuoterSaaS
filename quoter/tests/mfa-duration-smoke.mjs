import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { base, testAccount } from './auth-client.mjs'
import { codeFor } from './mfa-client.mjs'

if(process.env.QUOTER_ADMIN_ISOLATED!=='1'||!process.env.QUOTER_IMPORT_STATE||!process.env.QUOTER_TEST_URL)throw new Error('MFA duration tests require isolated local state')
assert.notEqual(resolve(process.env.QUOTER_IMPORT_STATE),resolve('.wrangler/state'))
function operator(args){const result=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(result.status,0,'Isolated operator command failed');return result.stdout}
function sql(query){return JSON.parse(operator([resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--persist-to',process.env.QUOTER_IMPORT_STATE,'--command',query,'--json'])).flatMap(entry=>entry.results||[])}
function session(cookie){const hash=createHash('sha256').update(cookie.split('=')[1]).digest('hex');return sql(`SELECT expires_at AS expiresAt,mfa_verified_until AS verifiedUntil FROM sessions WHERE token_hash='${hash}'`)[0]}
async function call(user,path,data,status=200){const response=await user.request(base+'/api'+path,data===undefined?{}:{method:'POST',body:JSON.stringify(data)});assert.equal(response.status,status);return response.json()}
async function cookieRequest(cookie,path='/auth/me'){return fetch(base+'/api'+path,{headers:{Cookie:cookie}})}
function lifetime(actual,seconds){const remaining=actual-Math.floor(Date.now()/1000);assert.ok(remaining<=seconds&&remaining>=seconds-30,`Unexpected lifetime for ${seconds} seconds`)}
async function verify(user,code,durationDays){
 const previous=user.cookie(),response=await user.request(base+'/api/security/admin-mfa',{method:'POST',body:JSON.stringify({action:'verify',code,durationDays})})
 assert.equal(response.status,200)
 const header=response.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);assert.match(header,/Path=\//)
 assert.notEqual(user.cookie(),previous);assert.equal((await cookieRequest(previous)).status,401)
 const result=await response.json(),stored=session(user.cookie()),seconds=durationDays?durationDays*86400:3600
 lifetime(result.verifiedUntil,seconds);assert.equal(stored.verifiedUntil,result.verifiedUntil)
 lifetime(stored.expiresAt,durationDays?seconds:604800)
 const maxAge=Number(/Max-Age=(\d+)/.exec(header)[1]);assert.ok(maxAge>0&&maxAge<=(durationDays?seconds:604800))
 assert.equal((await call(user,'/security/admin-mfa')).verifiedUntil,result.verifiedUntil)
 return result
}

const master=await testAccount(),ordinary=await testAccount(),ordinaryCookie=ordinary.cookie()
const ordinaryExpiry=session(ordinaryCookie).expiresAt;lifetime(ordinaryExpiry,604800)
operator(['scripts/admin-master.mjs','--email',master.email])
await call(ordinary,'/security/admin-mfa',{action:'verify',code:'123456',durationDays:180},403)
const setup=await call(master,'/security/admin-mfa',{action:'setup',currentPassword:master.password})
// Invalid durations must not consume a valid proof or extend a cookie.
for(const durationDays of [null,-1,1,365,90.5,'90','forever'])await call(master,'/security/admin-mfa',{action:'confirm',currentPassword:master.password,code:codeFor(setup.secret),durationDays},400)
const before=master.cookie(),confirmed=await call(master,'/security/admin-mfa',{action:'confirm',currentPassword:master.password,code:codeFor(setup.secret),durationDays:90})
assert.equal(confirmed.recoveryCodes.length,8);assert.notEqual(master.cookie(),before);assert.equal((await cookieRequest(before)).status,401)
lifetime(confirmed.verifiedUntil,90*86400);assert.equal(session(master.cookie()).expiresAt,confirmed.verifiedUntil)
const deadline=confirmed.verifiedUntil
for(const durationDays of [null,-90,181,'180'])await call(master,'/security/admin-mfa',{action:'verify',code:confirmed.recoveryCodes[0],durationDays},400)
assert.equal((await call(master,'/security/admin-mfa')).verifiedUntil,deadline)
await verify(master,confirmed.recoveryCodes[0],180)
await call(master,'/admin/overview')
const fixed=session(master.cookie());await call(master,'/security/admin-mfa');await call(master,'/admin/overview');assert.deepEqual(session(master.cookie()),fixed)
assert.equal(session(ordinaryCookie).expiresAt,ordinaryExpiry)

let browserCookie
if(process.env.QUOTER_BROWSER_PATH){
 const browser=await chromium.launch({executablePath:process.env.QUOTER_BROWSER_PATH,headless:true})
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(master.email);await page.getByLabel('Contraseña',{exact:true}).fill(master.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await page.getByRole('heading',{name:'Protege Administración',exact:true}).waitFor()
  await page.getByLabel('Duración del acceso 2FA').selectOption('90');await page.getByLabel('Código de autenticación o recuperación').fill(confirmed.recoveryCodes[1])
  await page.getByRole('button',{name:'Verificar acceso',exact:true}).click();await page.getByRole('heading',{name:'Administración',exact:true}).waitFor()
  await page.reload();await page.getByRole('heading',{name:'Administración',exact:true}).waitFor()
  for(const [index,days] of [[2,180],[3,0]]){
   await page.getByRole('button',{name:'Cambiar duración 2FA',exact:true}).click()
   await page.getByLabel('Duración del acceso 2FA').selectOption(String(days));await page.getByLabel('Código de autenticación o recuperación').fill(confirmed.recoveryCodes[index])
   const checked=page.waitForResponse(response=>response.url().endsWith('/api/security/admin-mfa')&&response.request().method()==='POST')
   await page.getByRole('button',{name:'Verificar acceso',exact:true}).click();const result=await(await checked).json();lifetime(result.verifiedUntil,days?days*86400:3600)
   await page.getByRole('heading',{name:'Administración',exact:true}).waitFor()
  }
  const cookie=(await context.cookies()).find(cookie=>cookie.name==='quoter_session');assert.ok(cookie);browserCookie=cookie.name+'='+cookie.value
  lifetime(session(browserCookie).expiresAt,604800)
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`MFA overflow at ${width}`)}
  assert.deepEqual(errors,[])
 }finally{await browser.close()}
}
assert.deepEqual(session(master.cookie()),fixed)
// Logging out invalidates the long-lived session; another login still needs MFA.
const remembered=master.cookie();await call(master,'/auth/logout',{});assert.equal((await cookieRequest(remembered)).status,401)
await call(master,'/auth/login',{email:master.email,password:master.password});assert.equal((await call(master,'/security/admin-mfa')).verified,false);await call(master,'/admin/overview',undefined,403)
await verify(master,confirmed.recoveryCodes[4],180)
// The regular MFA-expiry check and database write guard still apply to long sessions.
sql(`UPDATE sessions SET mfa_verified_until=0 WHERE token_hash='${createHash('sha256').update(master.cookie().split('=')[1]).digest('hex')}'`)
assert.equal((await call(master,'/security/admin-mfa')).verified,false);await call(master,'/admin/overview',undefined,403)
await verify(master,confirmed.recoveryCodes[5],180)
// Password recovery revokes every session, including other browsers and 180-day access.
const rememberedBeforeReset=master.cookie(),reset=await call(master,'/auth/forgot-password',{email:master.email}),password=randomUUID()+'Aa!'
const token=new URLSearchParams(new URL(reset.previewUrl).hash.slice(1)).get('token')
await call(master,'/auth/reset-password',{token,password});master.password=password
for(const cookie of [rememberedBeforeReset,browserCookie].filter(Boolean))assert.equal((await cookieRequest(cookie)).status,401)
await call(master,'/auth/login',{email:master.email,password});await call(master,'/admin/overview',undefined,403)
await verify(master,confirmed.recoveryCodes[6],180)
assert.ok((await call(master,'/admin/history')).rows.some(row=>row.action==='mfa.session.verified'))
const finalCookie=master.cookie();operator(['scripts/reset-admin-mfa.mjs','--email',master.email]);assert.equal((await cookieRequest(finalCookie)).status,401)
assert.equal(session(ordinaryCookie).expiresAt,ordinaryExpiry)
console.log('MFA duration passed: 90/180-day enrollment and access, fixed server/cookie expiry, proof-bound session rotation, invalid duration rejection, isolated sessions, fresh-login challenge, logout/password/operator revocation, expiry enforcement, mobile selector and shortening to one hour.')
