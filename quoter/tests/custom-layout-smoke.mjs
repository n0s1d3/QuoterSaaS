import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chromium} from 'playwright'
import {base,testAccount} from './auth-client.mjs'
import {productPng} from './image-fixture.mjs'
const owner=await testAccount(),other=await testAccount()
async function call(user,path,data,method='POST',status=200){const response=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(response.status,status,await response.clone().text());return response.json()}
let profile=await call(owner,'/branding')
profile=await call(owner,'/branding',{...profile,logo:productPng(),website:'https://example.com/custom',quoteTemplate:'corporate'},'PUT')
const customer=await call(owner,'/customers',{name:'Layout customer'},'POST',201),input={customerId:customer.id,issueDate:'2026-11-25',items:[{description:'Custom service',quantity:1,unitPrice:10000}],paymentTerms:'Garantía: 30 días'}
const old=await call(owner,'/quotes',{...input,notes:'LAYOUT_OLD'},'POST',201);assert.equal(old.branding.quoteTemplate,'corporate');assert.equal(old.branding.customLayout,null)
profile=await call(owner,'/branding',{...profile,quoteTemplate:'custom',customLayout:{logoSizeMm:20,headerPaddingMm:4,headerMinHeightMm:24,bodyFontSize:9,logoPosition:'left'}},'PUT')
assert.equal(profile.quoteTemplate,'custom');assert.equal(profile.customLayout.logoSizeMm,20)
assert.notEqual((await call(other,'/branding')).quoteTemplate,'custom')
for(const customLayout of [{logoSizeMm:-1},{logoSizeMm:100},{headerPaddingMm:1},{baseTemplate:'sidebar'},{logoPosition:'javascript:bad'},'html',{showBusinessName:'false'}])await call(owner,'/branding',{...profile,customLayout},'PUT',400)
assert.equal((await call(owner,'/branding')).customLayout.logoSizeMm,20)
const frozen=await call(owner,'/quotes',{...input,notes:'LAYOUT_FROZEN'},'POST',201);assert.equal(frozen.branding.quoteTemplate,'custom');assert.deepEqual(frozen.branding.customLayout,profile.customLayout)
const previousConfig=structuredClone(profile.customLayout)
profile=await call(owner,'/branding',{...profile,customLayout:{...profile.customLayout,logoSizeMm:35,headerMinHeightMm:58}},'PUT')
assert.deepEqual((await call(owner,'/quotes/'+frozen.id)).branding.customLayout,previousConfig)
const next=await call(owner,'/quotes',{...input,notes:'LAYOUT_NEXT'},'POST',201);assert.equal(next.branding.customLayout.logoSizeMm,35)
let changed=await call(owner,'/quotes/'+old.id,{quoteTemplate:'custom',revision:old.revision},'PATCH')
assert.deepEqual(changed.branding,{...old.branding,quoteTemplate:'custom',customLayout:profile.customLayout});assert.equal(changed.total,old.total)
await call(owner,'/quotes/'+old.id,{quoteTemplate:'custom',revision:old.revision},'PATCH',409)
await call(other,'/quotes/'+old.id,{quoteTemplate:'custom',revision:changed.revision},'PATCH',404)
profile=await call(owner,'/branding',{...profile,quoteTemplate:'minimal'},'PUT');assert.equal(profile.quoteTemplate,'minimal');assert.equal(profile.customLayout.logoSizeMm,35)
const manual=await call(owner,'/quotes',{...input,notes:'LAYOUT_MANUAL',quoteTemplate:'custom'},'POST',201);assert.equal(manual.branding.quoteTemplate,'custom');assert.equal(manual.branding.customLayout.logoSizeMm,35)
profile=await call(owner,'/branding',{...profile,quoteTemplate:'custom'},'PUT')
const backup=await call(owner,'/backups/export');assert.equal(backup.business.quoteTemplate,'custom');assert.deepEqual(backup.business.customLayout,profile.customLayout)
async function restore(){let preview=await call(other,'/backups/preview',{backup});while(!preview.ready)preview=await call(other,'/backups/preview',{backup,token:preview.token});await call(other,'/backups/restore',{backup,token:preview.token,confirm:true,updateProfile:true})}
await restore();await restore()
const restoredProfile=await call(other,'/branding');assert.equal(restoredProfile.quoteTemplate,'custom');assert.deepEqual(restoredProfile.customLayout,profile.customLayout)
const restored=await call(other,'/backups/export');assert.equal(restored.quotes.length,backup.quotes.length);assert.deepEqual(Object.fromEntries(restored.quotes.map(row=>[row.notes,JSON.parse(row.branding_snapshot).customLayout])),Object.fromEntries(backup.quotes.map(row=>[row.notes,JSON.parse(row.branding_snapshot).customLayout])))
const invalid=structuredClone(backup);invalid.business.customLayout.logoSizeMm=100;await call(other,'/backups/preview',{backup:invalid},'POST',400)
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob instanceof Blob&&blob.type==='application/pdf')window.previewPdfText=blob.text();return create(blob)}})
 const [name,value]=owner.cookie().split('=');await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}])
 await page.goto(base+'/settings');await page.getByRole('radio',{name:/^Personalizada/}).waitFor();await page.getByRole('button',{name:'Encabezado compacto',exact:true}).click()
 await page.getByLabel('Tamaño del logo (mm)',{exact:true}).fill('18');await page.getByLabel('Altura mínima del encabezado (mm)',{exact:true}).fill('24');await page.getByLabel('Margen vertical del encabezado (mm)',{exact:true}).fill('4.25');await page.getByLabel('Posición del logo',{exact:true}).selectOption('left');await page.getByLabel('Mostrar nombre del negocio',{exact:true}).uncheck()
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Custom editor overflow ${width}`)}
 await page.getByRole('button',{name:'Vista previa del PDF',exact:true}).click();await page.locator('dialog iframe').waitFor();const previewPdf=await page.evaluate(()=>window.previewPdfText);assert.ok(previewPdf.startsWith('%PDF-'));assert.ok(previewPdf.includes('https://example.com/custom'));await page.getByRole('button',{name:'Cerrar vista previa',exact:true}).click()
 await page.getByRole('button',{name:'Guardar marca',exact:true}).click();await page.getByRole('status').filter({hasText:'Marca guardada.'}).waitFor();assert.equal((await call(owner,'/branding')).customLayout.logoSizeMm,18);assert.equal((await call(owner,'/branding')).customLayout.headerPaddingMm,4.25)
 await page.reload();await page.getByLabel('Tamaño del logo (mm)',{exact:true}).waitFor();assert.equal(await page.getByLabel('Tamaño del logo (mm)',{exact:true}).inputValue(),'18');assert.equal(await page.getByLabel('Mostrar nombre del negocio',{exact:true}).isChecked(),false)
 await page.getByRole('radio',{name:/^Minimalista/}).check();await page.getByRole('radio',{name:/^Personalizada/}).check();assert.equal(await page.getByLabel('Tamaño del logo (mm)',{exact:true}).inputValue(),'18')
 await page.goto(base+'/quotes/new');await page.waitForFunction(()=>document.querySelector('input[type=radio][value=custom]')?.checked)
 await page.getByLabel('Nombre',{exact:true}).fill('Cliente diseño UI');await page.getByLabel('Descripción 1',{exact:true}).fill('Partida UI');await page.getByLabel('Precio 1',{exact:true}).fill('100')
 await page.getByRole('button',{name:'Guardar cotización',exact:true}).click();await page.getByRole('heading',{name:/^Q-\d+$/,exact:true}).waitFor();await page.getByRole('radio',{name:/^Personalizada/}).waitFor();const id=page.url().split('/').at(-1),saved=await call(owner,'/quotes/'+id)
 assert.equal(saved.branding.quoteTemplate,'custom');assert.equal(saved.branding.customLayout.logoSizeMm,18);assert.equal(saved.branding.customLayout.showBusinessName,false)
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();const download=await downloading;assert.equal(await download.failure(),null);const pdf=readFileSync(await download.path(),'latin1');assert.ok(pdf.includes('Q 100.00'));assert.ok(pdf.includes('https://example.com/custom'))
 await page.getByRole('radio',{name:/^Clásica/}).check();await page.getByText('Modelo actualizado.',{exact:false}).waitFor();await page.getByRole('radio',{name:/^Personalizada/}).check();await page.getByText('Modelo actualizado.',{exact:false}).waitFor();assert.equal((await call(owner,'/quotes/'+id)).branding.customLayout.logoSizeMm,18)
 assert.deepEqual(errors,[])
}finally{await browser.close()}
console.log('Custom layout passed: saved compact/default selection, strict settings, frozen quote layout and branding, explicit legacy selection, optimistic conflict and tenant isolation, idempotent backup/restore, responsive editor, live PDF preview, inheritance and download.')
