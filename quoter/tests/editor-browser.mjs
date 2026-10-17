import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { base, testAccount } from './auth-client.mjs'
const account=await testAccount()
async function call(path,data,method='POST',expected=200){const response=await account.request(base+'/api'+path,{...(data===undefined?{}:{method,body:JSON.stringify(data)})});assert.equal(response.status,expected,await response.clone().text());return response.json()}
const customer=await call('/customers',{name:'Editor regression customer'},'POST',201)
const input={customerId:customer.id,issueDate:'2026-10-15',notes:'Original persisted notes',items:[{description:'Editor regression service',quantity:1,unitPrice:100}]}
const quote=await call('/quotes',input,'POST',201)
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const [name,...value]=account.cookie().split('=');await context.addCookies([{name,value:value.join('='),url:base,httpOnly:true,sameSite:'Strict'}])
 let switchRequests=0,historyRequests=0
 await page.route('**/api/businesses',async route=>{const response=await route.fetch(),businesses=await response.json();await route.fulfill({json:[...businesses,{id:'not-visited-other-business',name:'Another business',role:'owner'}]})})
 await page.route('**/api/businesses/switch',async route=>{switchRequests++;await route.continue()})
 await page.route(`**/api/quotes/${quote.id}/history`,async route=>{historyRequests++;await route.fulfill({json:[{id:'legacy-malformed',action:'quote.edited',actorEmail:'synthetic@example.com',detail:'{malformed',createdAt:'2026-10-15 12:00:00'}]})})
 await page.goto(base+'/quotes');await page.getByRole('button',{name:`Editar cotización ${quote.quoteNumber}`,exact:true}).click()
 const notes=page.getByLabel('Notas internas',{exact:true});await notes.waitFor().catch(async error=>{throw new Error(error.message+' URL='+page.url()+' pageErrors='+JSON.stringify(errors)+' main='+await page.locator('main').innerText())});await notes.fill('PRIVATE_DRAFT_MUST_REMAIN')
 assert.ok((await page.title()).includes('Editar cotización'))
 async function revealMenu(){const toggle=page.getByRole('button',{name:'Alternar menú lateral'});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click()}
 await revealMenu();page.once('dialog',dialog=>dialog.dismiss());await page.locator('aside a[href="/catalog"]').click();assert.ok(page.url().endsWith(`/quotes/${quote.id}/edit`));assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN')
 const rejectedBack=new Promise(resolve=>page.once('dialog',async dialog=>{await dialog.dismiss();resolve()}));await page.evaluate(()=>history.back());await rejectedBack;await page.waitForURL(`**/quotes/${quote.id}/edit`);assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN')
 await revealMenu();page.once('dialog',dialog=>dialog.dismiss());await page.getByLabel('Negocio',{exact:true}).selectOption('not-visited-other-business');assert.equal(switchRequests,0);assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN')
 await page.getByLabel('Menú de usuario').click();page.once('dialog',dialog=>dialog.dismiss());await page.locator('.user-menu-popover').getByRole('button',{name:'Cerrar sesión',exact:true}).click();assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN')
 const latest=await call('/quotes/'+quote.id,{...input,revision:quote.revision,notes:'Updated in another tab'},'PUT')
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('button',{name:'Recargar versión guardada',exact:true}).waitFor();assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN');assert.equal((await call('/quotes/'+quote.id)).notes,'Updated in another tab')
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Recargar versión guardada',exact:true}).click();assert.equal(await notes.inputValue(),'PRIVATE_DRAFT_MUST_REMAIN')
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Recargar versión guardada',exact:true}).click();await page.waitForFunction(()=>document.querySelector('textarea[placeholder^="Recordatorios internos"]')?.value==='Updated in another tab')
 await notes.fill('Merged intentionally after reloading');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('heading',{name:quote.quoteNumber,exact:true}).waitFor();assert.equal((await call('/quotes/'+quote.id)).revision,latest.revision+1)
 assert.equal(historyRequests,0);await page.getByText('Historial de la cotización',{exact:true}).click();await page.getByText('Cotización editada',{exact:true}).waitFor();assert.equal(historyRequests,1)
 assert.deepEqual(errors,[])
 console.log('Editor regression passed: pending drafts survive canceled navigation/back/business-switch/logout, stale revision preserves draft, explicit reload and save succeed, history loads lazily and tolerates malformed legacy JSON.')
}finally{await browser.close()}
