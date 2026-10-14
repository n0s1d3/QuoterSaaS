import { enroll } from './mfa-client.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { base,testAccount } from './auth-client.mjs'
if(process.env.QUOTER_ADMIN_ISOLATED!=='1'||!process.env.QUOTER_IMPORT_STATE||!process.env.QUOTER_TEST_URL)throw new Error('Admin tests require a dedicated local preview server/state: QUOTER_ADMIN_ISOLATED=1, QUOTER_IMPORT_STATE and QUOTER_TEST_URL. Never use your normal business database.')
const state=resolve(process.env.QUOTER_IMPORT_STATE);assert.notEqual(state,resolve('.wrangler/state'))
const provision=email=>{const r=spawnSync(process.execPath,['scripts/admin-master.mjs','--email',email],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout)}
const execute=sql=>{const r=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--persist-to',state,'--command',sql,'--json'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout)}
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
const master=await testAccount(),owner=await testAccount(),outsider=await testAccount(),org=owner.user.organizationId
for(const user of [master,owner,outsider])await call(user,'/admin/overview',undefined,'GET',403)
// The designation can precede registration, but an unverified address has no admin privilege.
const pendingEmail='pending-'+randomUUID()+'@example.com',pendingPassword=randomUUID()+'A!';provision(pendingEmail)
const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingEmail,password:pendingPassword,confirmPassword:pendingPassword,businessName:'Pending master',isPlatformAdmin:true})});assert.equal(registration.status,201);let pendingCookie=registration.headers.get('set-cookie').split(';')[0];const registered=await registration.json();assert.equal(registered.isPlatformAdmin,false)
const pendingRequest=()=>fetch(base+'/api/admin/overview',{headers:{Cookie:pendingCookie}});assert.equal((await pendingRequest()).status,403)
const verificationToken=new URLSearchParams(new URL(registered.previewUrl).hash.slice(1)).get('token');assert.equal((await fetch(base+'/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:verificationToken,password:pendingPassword})})).status,200);assert.equal((await pendingRequest()).status,401);const pendingLogin=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingEmail,password:pendingPassword})});assert.equal(pendingLogin.status,200);pendingCookie=pendingLogin.headers.get('set-cookie').split(';')[0];assert.equal((await pendingRequest()).status,403);await enroll(call,{password:pendingPassword,request:(url,options)=>fetch(url,{...options,headers:{...options?.headers,Cookie:pendingCookie,'Content-Type':'application/json'}})});assert.equal((await pendingRequest()).status,200)
provision(master.email);assert.equal((await pendingRequest()).status,401);assert.equal((await call(master,'/auth/me')).isPlatformAdmin,true);const masterMfa=await enroll(call,master)
const customer=await call(owner,'/customers',{name:'PRIVATE_CUSTOMER_'+randomUUID(),email:'private-customer@example.com'},'POST',201),catalog=await call(owner,'/catalog',{name:'PRIVATE_PRODUCT_'+randomUUID(),category:'Servicio',unit:'hora',unitPrice:87654321,staleAfterDays:90},'POST',201)
const secretNote='PRIVATE_NOTE_'+randomUUID(),q=await call(owner,'/quotes',{customerId:customer.id,issueDate:'2026-10-14',notes:secretNote,items:[{description:'PRIVATE_DESCRIPTION',quantity:1,unitPrice:87654321,catalogItemId:catalog.id}]},'POST',201)
const payload={enabled:false,currentPassword:master.password}
await call(owner,'/admin/accounts/'+outsider.user.id,{...payload,isPlatformAdmin:true},'PATCH',403)
await call(master,'/admin/accounts/'+owner.user.id,{enabled:false,currentPassword:'wrong'},'PATCH',403)
await call(master,'/admin/accounts/'+master.user.id,payload,'PATCH',400)
for(const path of ['/admin/overview','/admin/accounts','/admin/businesses','/admin/history']){
 const result=await call(master,path),encoded=JSON.stringify(result)
 for(const value of [customer.name,customer.email,catalog.name,secretNote,'PRIVATE_DESCRIPTION','87654321',owner.email,master.email,'password_hash','password_salt','logo','customer_id'])assert.ok(!encoded.includes(value),`Private value leaked via ${path}`)
}
assert.equal((await call(master,'/admin/businesses?search='+encodeURIComponent(org))).rows.length,1)
assert.equal((await call(master,'/admin/businesses?search='+encodeURIComponent("%' OR 1=1 --"))).rows.length,0)
await call(master,'/admin/accounts?page=0',undefined,'GET',400)
await call(master,'/admin/quotes',undefined,'GET',404);await call(master,'/admin/backups/export',undefined,'GET',404)
await call(master,'/businesses/switch',{organizationId:org},'POST',403)
await call(master,'/quotes/'+q.id,undefined,'GET',404)
let r=await master.request(base+'/api/admin/accounts/'+owner.user.id,{method:'PATCH',headers:{Origin:'https://other.example'},body:JSON.stringify(payload)});assert.equal(r.status,403)
await call(master,'/admin/accounts/'+owner.user.id,payload,'PATCH');await call(owner,'/auth/me',undefined,'GET',401)
r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:owner.email,password:owner.password})});assert.equal(r.status,403)
await call(master,'/admin/accounts/'+owner.user.id,{enabled:true,currentPassword:master.password},'PATCH');await call(owner,'/auth/login',{email:owner.email,password:owner.password});assert.equal((await call(owner,'/quotes/'+q.id)).notes,secretNote)
await call(master,'/admin/businesses/'+org,{enabled:false,currentPassword:master.password},'PATCH');assert.equal((await call(owner,'/subscription')).status,'suspended');assert.equal((await call(owner,'/quotes/'+q.id)).notes,secretNote);assert.equal((await call(owner,'/quotes/'+q.id,{status:'accepted'},'PATCH',403)).code,'BUSINESS_SUSPENDED');await call(owner,'/backups/export')
const reference='admin-payment-'+randomUUID(),payment={planId:'pro',reference,currentPassword:master.password},activated=await call(master,'/admin/businesses/'+org+'/activate',payment)
assert.equal(activated.subscription.status,'suspended');const until=activated.subscription.paidUntil;assert.ok(until>Math.floor(Date.now()/1000)+27*86400)
assert.equal((await call(master,'/admin/businesses/'+org+'/activate',payment)).reused,true);assert.equal((await call(owner,'/subscription')).paidUntil,until)
await call(master,'/admin/businesses/'+outsider.user.organizationId+'/activate',payment,'POST',409)
await call(master,'/admin/businesses/'+org,{enabled:true,currentPassword:master.password},'PATCH');assert.equal((await call(owner,'/subscription')).status,'active');await call(owner,'/quotes/'+q.id,{status:'accepted'},'PATCH')
// Administration remains accessible if the master's own business is expired or suspended.
execute(`UPDATE organizations SET trial_expires_at=0,paid_until=NULL WHERE id='${master.user.organizationId}'`);assert.equal((await call(master,'/subscription')).status,'permanent');await call(master,'/customers',{name:'Master permanent access'},'POST',201);execute(`UPDATE organizations SET suspended_at=CURRENT_TIMESTAMP WHERE id='${master.user.organizationId}'`);await call(master,'/admin/overview')
const audit=await call(master,'/admin/history');for(const action of ['account.disabled','account.enabled','business.suspended','business.enabled','plan.month.activated'])assert.ok(audit.rows.some(row=>row.action===action&&[org,owner.user.id].includes(row.targetId)));assert.equal(audit.rows.filter(row=>row.action==='plan.month.activated'&&row.targetId===org).length,1);assert.ok(!JSON.stringify(audit).includes(reference));assert.ok(!JSON.stringify(audit).includes(owner.email))
if(process.env.QUOTER_BROWSER_PATH){
 const browser=await chromium.launch({executablePath:process.env.QUOTER_BROWSER_PATH,headless:true})
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(master.email);await page.getByLabel('Contraseña',{exact:true}).fill(master.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Protege Administración',exact:true}).waitFor();await page.getByLabel('Código de autenticación o recuperación').fill(masterMfa.recoveryCodes[0]);await page.getByRole('button',{name:'Verificar acceso',exact:true}).click();await page.getByRole('heading',{name:'Administración',exact:true}).waitFor()
  await page.goto(base+'/admin');await page.getByRole('heading',{name:'Administración',exact:true}).waitFor();await page.locator('.admin-card').first().waitFor();assert.equal(await page.locator('.subscription-notice').count(),0)
  for(const width of [320,390,768,1280,1920]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Admin overflow at ${width}`)}
  await page.getByRole('button',{name:'Cuentas',exact:true}).click();await page.locator('.admin-card').filter({hasText:outsider.user.id}).waitFor();await page.getByLabel('Confirmar contraseña administrativa').fill(master.password);page.once('dialog',dialog=>dialog.accept());await page.locator('.admin-card').filter({hasText:outsider.user.id}).getByRole('button',{name:'Desactivar cuenta'}).click();await page.getByText('Cambio administrativo aplicado.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Confirmar contraseña administrativa').inputValue(),'');assert.ok(!await page.locator('main').innerText().then(text=>text.includes(secretNote)||text.includes(customer.name)||text.includes(owner.email)))
  await page.getByRole('button',{name:'Negocios',exact:true}).click();await page.getByLabel('Buscar por negocio o ID').fill(org);await page.locator('.admin-search').getByRole('button',{name:'Buscar',exact:true}).click();await page.locator('.admin-card').filter({hasText:org}).waitFor();await page.getByRole('button',{name:'Activar o renovar plan',exact:true}).click();await page.getByLabel('Referencia única de pago').fill(reference+'-ui');await page.getByLabel('Confirmar contraseña administrativa').fill(master.password);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Registrar pago y renovar',exact:true}).click();try{await page.getByText('Mes registrado.',{exact:false}).waitFor({timeout:10000})}catch(error){console.log('Isolated admin UI errors:',errors);console.log('Isolated admin UI message:',await page.getByRole('alert').allTextContents());throw error};assert.deepEqual(errors,[])
  await context.clearCookies();await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(owner.email);await page.getByLabel('Contraseña',{exact:true}).fill(owner.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Resumen',exact:true}).waitFor();assert.equal(await page.locator('nav').getByRole('link',{name:'Administración',exact:true}).count(),0);await page.goto(base+'/admin');await page.getByText('Acceso exclusivo de la cuenta maestra.',{exact:true}).waitFor()
 }finally{await browser.close()}
}
for(let i=0;i<10;i++)await call(master,'/admin/accounts/'+owner.user.id,{enabled:true,currentPassword:'wrong'},'PATCH',403)
await call(master,'/admin/accounts/'+owner.user.id,{enabled:true,currentPassword:master.password},'PATCH',429)
console.log('Platform admin passed: verified master provisioning/handover, private-field exclusion, tenant isolation, reauthentication/CSRF, account/session controls, business suspension, monthly payment/idempotency, audit and responsive UI.')
