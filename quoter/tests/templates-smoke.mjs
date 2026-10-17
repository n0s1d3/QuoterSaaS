import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { base,testAccount } from './auth-client.mjs'
const account=await testAccount(),other=await testAccount()
async function call(path,data,method='POST',status=200,user=account){const response=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(response.status,status,await response.clone().text());return response.json()}
const profile=await call('/branding'),customer=await call('/customers',{name:'Template customer'},'POST',201)
const input={customerId:customer.id,issueDate:'2026-10-17',notes:'PRIVATE_TEMPLATE_NOTES',paymentTerms:'Public payment terms',items:[{description:'Template service',quantity:1,unitPrice:10000}]}
const original=await call('/quotes',input,'POST',201);assert.equal(original.branding.quoteTemplate,'default')
await call('/branding',{...profile,quoteTemplate:'unknown'},'PUT',400)
await call('/branding',{...profile,quoteTemplate:'sidebar'},'PUT')
const inherited=await call('/quotes',input,'POST',201);assert.equal(inherited.branding.quoteTemplate,'sidebar')
const custom=await call('/quotes',{...input,quoteTemplate:'minimal'},'POST',201);assert.equal(custom.branding.quoteTemplate,'minimal')
await call('/quotes',{...input,quoteTemplate:"default'); DROP TABLE quotes;--"},'POST',400)
await call('/branding',{...profile,name:'New business brand',primaryColor:'#d00000',quoteTemplate:'corporate'},'PUT')
assert.deepEqual((await call('/quotes/'+original.id)).branding,original.branding)
const changed=await call('/quotes/'+original.id,{quoteTemplate:'minimal',revision:original.revision},'PATCH')
assert.deepEqual(changed.branding,{...original.branding,quoteTemplate:'minimal'});assert.equal(changed.total,original.total);assert.equal(changed.revision,original.revision+1)
await call('/quotes/'+original.id,{quoteTemplate:'sidebar',revision:original.revision},'PATCH',409)
await call('/quotes/'+original.id,{quoteTemplate:'invalid',revision:changed.revision},'PATCH',400)
await call('/quotes/'+original.id,{quoteTemplate:'corporate',revision:changed.revision},'PATCH',404,other)
const edited=await call('/quotes/'+original.id,{...input,revision:changed.revision,quoteTemplate:'sidebar'},'PUT');assert.equal(edited.branding.name,profile.name);assert.equal(edited.branding.quoteTemplate,'sidebar')
const copied=await call('/quotes/'+original.id+'/duplicate',{},'POST',201);assert.equal(copied.branding.quoteTemplate,'corporate');assert.equal(copied.branding.name,'New business brand')
const exported=await call('/backups/export');assert.equal(exported.business.quoteTemplate,'corporate')
let preview=await call('/backups/preview',{backup:exported},'POST',200,other);while(!preview.ready)preview=await call('/backups/preview',{backup:exported,token:preview.token},'POST',200,other)
await call('/backups/restore',{backup:exported,token:preview.token,confirm:true,updateProfile:true},'POST',200,other)
assert.equal((await call('/branding',undefined,'GET',200,other)).quoteTemplate,'corporate')
const restored=await call('/backups/export',undefined,'GET',200,other)
assert.deepEqual(restored.quotes.map(q=>JSON.parse(q.branding_snapshot).quoteTemplate).sort(),exported.quotes.map(q=>JSON.parse(q.branding_snapshot).quoteTemplate).sort())
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],violations=[]
 page.on('pageerror',error=>errors.push(error.message));await page.exposeFunction('recordCsp',directive=>violations.push(directive));await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>window.recordCsp(event.violatedDirective)))
 const [name,...value]=account.cookie().split('=');await context.addCookies([{name,value:value.join('='),url:base,httpOnly:true,sameSite:'Strict'}])
 await page.goto(base+'/settings');await page.getByRole('radio',{name:/^Corporativa/}).waitFor()
 await page.getByRole('radio',{name:/^Minimalista/}).check();await page.getByRole('button',{name:'Vista previa del PDF',exact:true}).click();await page.locator('dialog iframe').waitFor();assert.ok((await page.locator('dialog iframe').getAttribute('src')).startsWith('blob:'));await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'})
 await page.getByRole('button',{name:'Guardar marca',exact:true}).click();await page.getByRole('status').filter({hasText:'Marca guardada.'}).waitFor();assert.equal((await call('/branding')).quoteTemplate,'minimal')
 await page.goto(base+'/quotes/'+original.id);await page.getByRole('radio',{name:/^Lateral/}).waitFor();await page.getByRole('radio',{name:/^Corporativa/}).check();await page.getByText('Modelo actualizado.',{exact:false}).waitFor();assert.equal((await call('/quotes/'+original.id)).branding.name,profile.name)
 await page.getByRole('button',{name:'Vista previa del PDF',exact:true}).click();await page.locator('dialog iframe').waitFor();await page.getByRole('button',{name:'Cerrar vista previa'}).click()
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();const download=await downloading;assert.equal(download.suggestedFilename(),original.quoteNumber+'.pdf');assert.equal(await download.failure(),null)
 for(const width of [375,768,1280]){
  await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'responsive layout at '+width)
 }
 await page.getByRole('button',{name:'Editar cotización',exact:true}).click();await page.getByRole('radio',{name:/^Corporativa/}).waitFor();await page.getByRole('radio',{name:/^Minimalista/}).check();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('heading',{name:original.quoteNumber,exact:true}).waitFor();assert.equal((await call('/quotes/'+original.id)).branding.quoteTemplate,'minimal')
 assert.deepEqual(errors,[]);assert.deepEqual(violations,[])
 console.log('Templates passed: four layouts, business default and per-quote selection, frozen branding, optimistic concurrency, tenant isolation, backup roundtrip, browser preview/download, editing and mobile widths.')
}finally{await browser.close()}
