import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { base,testAccount } from './auth-client.mjs'
const owner=await testAccount()
async function create(path,data){const r=await owner.request(base+'/api'+path,{method:'POST',body:JSON.stringify(data)});assert.equal(r.status,201,await r.clone().text());return r.json()}
const customer=await create('/customers',{name:'Cliente de vigencia'}),quote=await create('/quotes',{customerId:customer.id,issueDate:'2026-10-14',items:[{description:'Trabajo',quantity:1,unitPrice:100}]})
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base);await page.getByLabel('Correo',{exact:true}).fill(owner.email);await page.getByLabel('Contraseña',{exact:true}).fill(owner.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Resumen',exact:true}).waitFor();await page.locator('.subscription-notice').getByText(/Prueba de 7 días/).waitFor()
 await page.goto(base+'/quotes/'+quote.id+'/edit');const notes=page.getByLabel('Notas internas');await notes.fill('Borrador que debe conservarse al vencer')
 const r=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--command',`UPDATE organizations SET trial_expires_at=unixepoch()-1,paid_until=NULL WHERE id='${owner.user.organizationId}'`,'--json'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout)
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.subscription-notice').getByText(/Vigencia vencida/).waitFor();assert.equal(await notes.inputValue(),'Borrador que debe conservarse al vencer');assert.ok(await notes.isDisabled());assert.ok(await page.getByRole('button',{name:'Guardar cambios',exact:true}).isDisabled())
 await page.goto(base+'/quotes/'+quote.id);await page.getByRole('button',{name:'Descargar PDF',exact:true}).waitFor();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.pdf'));assert.equal(await page.getByRole('button',{name:'Editar cotización',exact:true}).count(),0)
 await page.goto(base+'/data');await page.getByRole('heading',{name:'Datos y recuperación'}).waitFor();assert.ok(await page.getByLabel('Seleccionar respaldo JSON').isDisabled());const backupDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar respaldo JSON',exact:true}).click();assert.ok((await backupDownload).suggestedFilename().endsWith('.json'))
 const paid=spawnSync(process.execPath,['scripts/activate-plan.mjs','--business',owner.user.organizationId,'--plan','2','--reference','browser-'+randomUUID(),'--operator','operator@example.com'],{encoding:'utf8'});assert.equal(paid.status,0,paid.stderr+paid.stdout)
 await page.goto(base+'/plan');await page.getByText('Plan mensual activo',{exact:true}).waitFor();await page.getByRole('heading',{name:'Plan actual: Plan 2',exact:true}).waitFor()
 for(const width of [320,390,768,1280,1920]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Subscription page overflow at ${width}`)}
 await page.goto(base+'/quotes/'+quote.id+'/edit');assert.ok(await page.getByRole('button',{name:'Guardar cambios',exact:true}).isEnabled());assert.deepEqual(errors,[])
 console.log('Subscription browser passed: trial banner, expiry without lost draft, disabled writes, PDF/backup exports, renewal recovery and responsive plan history.')
}finally{await browser.close()}
