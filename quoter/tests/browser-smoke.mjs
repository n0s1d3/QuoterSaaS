import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { base,testAccount } from './auth-client.mjs'
const user=await testAccount()
async function create(path,data){const response=await user.request(base+'/api'+path,{method:'POST',body:JSON.stringify(data)});assert.equal(response.status,201,await response.clone().text());return response.json()}
const customer=await create('/customers',{name:'Cliente Pérez UI'})
const source=await create('/quotes',{customerId:customer.id,issueDate:'2026-10-01',notes:'Notas de la prueba de navegador',items:[{description:'Servicio UI',quantity:1,unitPrice:12300}]})
for(let index=0;index<12;index++)await create('/quotes',{customerId:customer.id,issueDate:'2026-10-01',items:[{description:'Paginación UI',quantity:1,unitPrice:100}]})
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(base)
 await page.getByRole('heading',{name:'Bienvenido',exact:true}).waitFor()
 await page.getByLabel('Correo',{exact:true}).fill(user.email);await page.getByLabel('Contraseña',{exact:true}).fill(user.password)
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Resumen',exact:true}).waitFor()
 await page.locator('.mini-quote').first().waitFor()
 for(const width of [320,390,768,1280,1920]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}`)}
 await page.setViewportSize({width:390,height:844})
 await page.getByRole('button',{name:'Alternar menú lateral'}).tap();await page.getByRole('button',{name:'Cerrar menú',exact:true}).tap({position:{x:350,y:200}});assert.equal(await page.getByRole('button',{name:'Alternar menú lateral'}).getAttribute('aria-expanded'),'false')
 await page.getByLabel('Menú de usuario').tap();await page.getByRole('heading',{name:'Resumen',exact:true}).tap();assert.equal(await page.locator('.user-menu').evaluate(element=>element.open),false)
 assert.equal(await page.locator('aside').getByRole('button',{name:'Cerrar sesión'}).count(),0)
 await page.getByLabel('Buscar cotizaciones',{exact:true}).fill('perez');await page.getByLabel('Buscar cotizaciones',{exact:true}).press('Enter')
 await page.getByRole('button',{name:'Siguiente',exact:true}).waitFor();assert.equal(await page.locator('.quote-card').count(),12)
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByText('Página 2 de 2 · 13 cotizaciones',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelectorAll('.quote-card').length===1)
 await page.getByLabel('Buscar cotizaciones',{exact:true}).fill(source.quoteNumber);await page.getByLabel('Buscar cotizaciones',{exact:true}).press('Enter');await page.getByRole('button',{name:`Ver cotización ${source.quoteNumber}`,exact:true}).waitFor()
 await page.getByRole('button',{name:`Aceptada: ${source.quoteNumber}`,exact:true}).click();await page.locator('.quote-card .badge').filter({hasText:'Aceptada'}).waitFor()
 await page.getByRole('button',{name:`Ver cotización ${source.quoteNumber}`,exact:true}).click();await page.getByRole('heading',{name:source.quoteNumber,exact:true}).waitFor()
 const [pdf]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Descargar PDF'}).click()]);assert.ok(pdf.suggestedFilename().endsWith('.pdf'))
 await page.getByText('Historial de la cotización',{exact:true}).click();await page.getByText('Estado actualizado · Aceptada',{exact:true}).waitFor()
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Eliminar cotización',exact:true}).click();await page.getByRole('heading',{name:'Cotizaciones',exact:true}).waitFor()
 await page.goto(base+'/data');await page.getByRole('button',{name:`Recuperar ${source.quoteNumber}`,exact:true}).waitFor();await page.getByRole('button',{name:`Recuperar ${source.quoteNumber}`,exact:true}).click();await page.getByText(`${source.quoteNumber} recuperada.`,{exact:true}).waitFor()
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Descargar respaldo JSON'}).click()]);const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const file=Buffer.concat(chunks),backup=JSON.parse(file.toString());assert.equal(backup.quotes.length,13)
 await page.getByLabel('Seleccionar respaldo JSON').setInputFiles({name:'respaldo.json',mimeType:'application/json',buffer:file});await page.getByRole('heading',{name:/Revisión:/}).waitFor();assert.equal(await page.getByRole('button',{name:'Restaurar respaldo'}).isDisabled(),true)
 await page.getByLabel('Revisé el contenido y autorizo sobrescribir los registros existentes').check();await page.getByRole('button',{name:'Restaurar respaldo'}).click();await page.getByText('Respaldo restaurado. Los registros existentes se actualizaron y solo se agregaron los que faltaban.',{exact:true}).waitFor()
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.goto(base);await page.locator('.compact-stats').waitFor();assert.ok((await page.locator('.compact-stats').innerText()).includes('13'))
 await page.goto(base+'/plan');await page.getByRole('heading',{name:'Plan actual: Plan 1',exact:true}).waitFor();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Probar Plan 2',exact:true}).click();await page.getByRole('heading',{name:'Plan actual: Plan 2',exact:true}).waitFor();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Probar Plan 1',exact:true}).click();await page.getByRole('heading',{name:'Plan actual: Plan 1',exact:true}).waitFor();
 for(let index=0;index<7;index++)await create('/quotes',{customerId:customer.id,issueDate:'2026-10-01',items:[{description:'Aviso de uso',quantity:1,unitPrice:100}]});await page.reload();await page.locator('.plan-notice').getByText(/cotizaciones 20\/25/).waitFor();await page.getByText('Te acercas al límite',{exact:true}).waitFor();
 await page.getByLabel('Menú de usuario').tap();await page.locator('.user-menu-popover').getByRole('button',{name:'Cerrar sesión',exact:true}).tap();await page.getByRole('heading',{name:'Bienvenido',exact:true}).waitFor()
 assert.deepEqual(errors,[])
 console.log('Browser smoke passed: responsive login/navigation, menus, server search, pagination, status/PDF/history, trash recovery, backup preview/restore and logout. Local test data remains isolated.')
}finally{await browser.close()}
