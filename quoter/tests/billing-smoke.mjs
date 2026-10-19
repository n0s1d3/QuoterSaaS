import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { enroll } from './mfa-client.mjs'
import { base,testAccount } from './auth-client.mjs'
if(process.env.QUOTER_ADMIN_ISOLATED!=='1'||!process.env.QUOTER_IMPORT_STATE)throw new Error('Billing checks require the isolated integration runner and its temporary database')
const master=await testAccount(),owner=await testAccount(),org=owner.user.organizationId
const provision=spawnSync(process.execPath,['scripts/admin-master.mjs','--email',master.email],{encoding:'utf8'});assert.equal(provision.status,0,provision.stderr)
async function call(user,path,data,method='POST',status=200){const r=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(r.status,status,await r.clone().text());return r.json()}
await enroll(call,master)
const path='/admin/businesses/'+org+'/activate',initial=await call(owner,'/plans')
let until=initial.subscription.trialExpiresAt
for(const [months,tariff] of [[3,13965],[6,26460],[12,49980]]){
 const payment={planId:'gratis',durationMonths:months,reference:'billing-'+org+'-'+months,currentPassword:master.password,tariffCents:1}
 const result=await call(master,path,payment);assert.equal(result.reused,false);assert.ok(result.subscription.paidUntil>until+27*86400*months)
 const plans=await call(owner,'/plans'),record=plans.activations[0];assert.equal(record.periodStart,until);assert.equal(record.durationMonths,months);assert.equal(record.tariffCents,tariff)
 until=result.subscription.paidUntil
 const replay=await call(master,path,payment);assert.equal(replay.reused,true);assert.equal(replay.subscription.paidUntil,until)
 await call(master,path,{...payment,durationMonths:months===3?6:3},'POST',409)
}
for(const durationMonths of [0,2,'12',null,24])await call(master,path,{planId:'gratis',durationMonths,reference:'invalid-'+String(durationMonths),currentPassword:master.password},'POST',400)
await call(owner,path,{planId:'gratis',durationMonths:12,reference:'owner-bypass',currentPassword:owner.password},'POST',403)
const cli=spawnSync(process.execPath,['scripts/activate-plan.mjs','--business',org,'--plan','1','--months','12','--reference','billing-cli-'+org,'--operator','operator@example.com'],{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr)
assert.equal((await call(owner,'/plans')).activations[0].durationMonths,12)
const browser=await chromium.launch({headless:true,...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{})})
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 const [name,...parts]=owner.cookie().split('=');await context.addCookies([{name,value:parts.join('='),url:base,httpOnly:true,sameSite:'Strict'}])
 await page.goto(base+'/plan');await page.getByLabel('Periodo de suscripción',{exact:true}).waitFor();assert.equal(await page.getByLabel('Periodo de suscripción').inputValue(),'12');assert.ok((await page.locator('.plan-card').first().innerText()).includes('499.80'))
 await page.getByLabel('Periodo de suscripción').selectOption('3');assert.ok((await page.locator('.plan-card').first().innerText()).includes('139.65'))
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'billing overflow at '+width)}
 assert.deepEqual(errors,[])
}finally{await browser.close()}
console.log('Billing passed: 3/6/12 calendar periods, authoritative tariff snapshots, idempotency and period conflicts, role restrictions, CLI and responsive price selection.')
