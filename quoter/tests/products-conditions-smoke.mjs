import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chromium} from 'playwright'
import {base,testAccount} from './auth-client.mjs'
import {productPng} from './image-fixture.mjs'
const owner=await testAccount(),other=await testAccount(),image=productPng(),replacement=productPng(2,2,30)
async function call(user,path,data,method='POST',status=200){const response=await user.request(base+'/api'+path,data===undefined?{}:{method,body:JSON.stringify(data)});assert.equal(response.status,status,await response.clone().text());return response.json()}
const profile=await call(owner,'/branding'),customer=await call(owner,'/customers',{name:'Photo customer'},'POST',201)
const product={name:'Producto con foto',description:'Prueba de imagen',category:'Producto',unit:'unidad',unitPrice:10000,duration:null,validUntil:null,staleAfterDays:90,image}
const catalog=await call(owner,'/catalog',product,'POST',201)
for(const bad of ['https://example.com/image.png','data:image/svg+xml;base64,PHN2Zy8+','data:image/png;base64,AA==',productPng(641,2)])await call(owner,'/catalog',{...product,image:bad},'POST',400)
const item={description:'Producto con foto',quantity:1,unitPrice:10000,catalogItemId:catalog.id},input={customerId:customer.id,issueDate:'2026-11-25',items:[item],notes:'PRIVATE_PHOTO_NOTES'}
const old=await call(owner,'/quotes',input,'POST',201);assert.equal(old.items[0].image,image);assert.equal(old.paymentTerms,null)
const conditions={paymentDeadline:'50% de anticipo',paymentMethods:'Transferencia bancaria',bankTransfer:'Titular de prueba — Cuenta Monetaria 12345 — Banco de prueba',deliveryTime:'24 a 48 horas',shippingPrice:'Según destino',departmentShipping:'Cargo Expreso — Q40.00',warranty:'30 días por desperfectos de fábrica',warrantyPolicy:'Política de garantía y devolución. '.repeat(90),validityDays:15,advisorName:'Ana',advisorEmail:'ana@example.com'}
await call(owner,'/branding',{...profile,quoteConditions:conditions},'PUT');assert.equal((await call(owner,'/branding')).quoteConditions.validityDays,15)
for(const invalid of [{validityDays:0},{advisorEmail:'wrong'},{warrantyPolicy:'x'.repeat(4001)}])await call(owner,'/branding',{...profile,quoteConditions:invalid},'PUT',400)
assert.equal((await call(owner,'/branding')).quoteConditions.validityDays,15)
const saved=await call(owner,'/quotes',input,'POST',201);assert.equal(saved.expiryDate,'2026-12-10');assert.ok(saved.paymentTerms.length>2000);assert.ok(saved.paymentTerms.includes('Q40.00'));assert.ok(saved.paymentTerms.includes(conditions.bankTransfer));assert.equal(saved.items[0].image,image)
const noise=productPng(110,110,100,true);assert.ok(noise.length<60000)
await call(owner,'/quotes',{...input,items:Array.from({length:11},()=>({...item,image:noise}))},'POST',400)
await call(owner,'/catalog/'+catalog.id,{...product,image:replacement},'PUT')
await call(owner,'/catalog/'+catalog.id,{...product,image:undefined,name:'Producto actualizado'},'PUT')
assert.equal((await call(owner,'/catalog')).find(row=>row.id===catalog.id).image,replacement)
assert.equal((await call(owner,'/quotes/'+saved.id)).items[0].image,image)
await call(owner,'/branding',{...(await call(owner,'/branding')),quoteConditions:{warranty:'Nueva garantía',validityDays:30}},'PUT')
const edit=await call(owner,'/quotes/'+saved.id,{...input,revision:saved.revision},'PUT');assert.equal(edit.items[0].image,image);assert.equal(edit.paymentTerms,saved.paymentTerms);assert.equal(edit.expiryDate,saved.expiryDate)
const newer=await call(owner,'/quotes',input,'POST',201);assert.equal(newer.items[0].image,replacement);assert.ok(newer.paymentTerms.includes('Nueva garantía'))
const without=await call(owner,'/quotes',{...input,expiryDate:null,items:[{...item,image:null}]},'POST',201);assert.equal(without.items[0].image,null);assert.equal(without.expiryDate,null)
await call(other,'/quotes/'+saved.id,undefined,'GET',404)
const otherCustomer=await call(other,'/customers',{name:'Other'},'POST',201)
await call(other,'/quotes',{...input,customerId:otherCustomer.id},'POST',400)
assert.ok(!(JSON.stringify(await call(other,'/catalog'))).includes(image))
const backup=await call(owner,'/backups/export');assert.equal(backup.version,2);assert.equal(Object.keys(backup.images).length,2);assert.ok(!String(backup.items[0].image).startsWith('data:'))
async function restore(){let preview=await call(other,'/backups/preview',{backup});while(!preview.ready)preview=await call(other,'/backups/preview',{backup,token:preview.token});await call(other,'/backups/restore',{backup,token:preview.token,confirm:true,updateProfile:true})}
await restore();await restore()
const restored=await call(other,'/backups/export');assert.equal(restored.quotes.length,backup.quotes.length);assert.equal(restored.catalog.length,1);assert.deepEqual(restored.business.quoteConditions,backup.business.quoteConditions)
const restoredLines=restored.items.map(row=>row.image?restored.images[row.image]:null).sort();assert.deepEqual(restoredLines,backup.items.map(row=>row.image?backup.images[row.image]:null).sort())
const legacy=structuredClone(backup);legacy.version=1;delete legacy.images;legacy.business.logo=backup.business.logo?backup.images[backup.business.logo]:null;for(const row of [...legacy.catalog,...legacy.items])row.image=row.image?backup.images[row.image]:null;for(const row of legacy.quotes){const brand=JSON.parse(row.branding_snapshot);brand.logo=brand.logo?backup.images[brand.logo]:null;row.branding_snapshot=JSON.stringify(brand)}
let reviewed=await call(other,'/backups/preview',{backup:legacy});while(!reviewed.ready)reviewed=await call(other,'/backups/preview',{backup:legacy,token:reviewed.token});assert.equal(reviewed.ready,true)
const browser=await chromium.launch({...(process.env.QUOTER_BROWSER_PATH?{executablePath:process.env.QUOTER_BROWSER_PATH}:{}),headless:true})
try{
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob instanceof Blob&&blob.type==='application/pdf')window.previewPdfText=blob.text();return create(blob)}});const [name,value]=owner.cookie().split('=');await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}])
 await page.goto(base+'/settings');await page.getByLabel('Plazo de pago',{exact:true}).fill('Saldo contra entrega');await page.getByLabel('Transferencia bancaria',{exact:true}).fill(conditions.bankTransfer);await page.getByLabel('Política de garantía y devoluciones',{exact:true}).fill(conditions.warrantyPolicy);await page.getByLabel('Validez predeterminada (días)',{exact:true}).fill('15');await page.getByLabel('Correo del asesor',{exact:true}).fill('ana@example.com');await page.getByRole('button',{name:'Guardar marca',exact:true}).click();await page.getByRole('status').filter({hasText:'Marca guardada.'}).waitFor()
 await page.getByRole('button',{name:'Vista previa del PDF',exact:true}).click();await page.locator('dialog iframe').waitFor();const previewPdf=await page.evaluate(()=>window.previewPdfText),previewDates=previewPdf.match(/\d{4}-\d{2}-\d{2}/g);assert.ok(previewDates?.length>=2);const previewExpiry=new Date(previewDates[0]+'T12:00:00Z');previewExpiry.setUTCDate(previewExpiry.getUTCDate()+15);assert.equal(previewDates[1],previewExpiry.toISOString().slice(0,10));await page.getByRole('button',{name:'Cerrar vista previa',exact:true}).click()
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Settings overflow at ${width}`)}
 await page.goto(base+'/catalog');await page.getByLabel('Nombre',{exact:true}).fill('Producto creado en UI');await page.getByLabel('Precio por unidad (Q)',{exact:true}).fill('150')
 await page.getByLabel('Imagen del producto',{exact:true}).setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});await page.locator('.product-image-preview img').waitFor();await page.getByRole('button',{name:'Guardar partida',exact:true}).click();await page.getByRole('heading',{name:'Producto creado en UI',exact:true}).waitFor()
 await page.goto(base+'/quotes/new');await page.getByLabel('Condiciones de pago',{exact:true}).waitFor();assert.ok((await page.getByLabel('Condiciones de pago',{exact:true}).inputValue()).includes('Saldo contra entrega'))
 await page.getByLabel('Descripción 1',{exact:true}).fill('Nueva partida con foto');await page.getByLabel('Precio 1',{exact:true}).fill('120');await page.getByLabel('Nombre',{exact:true}).fill('Cliente UI imágenes')
 await page.getByLabel('Imagen de la partida 1',{exact:true}).setInputFiles({name:'quote.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});await page.locator('.product-image-preview img').waitFor()
 const issue=await page.getByLabel('Fecha de emisión',{exact:true}).inputValue(),expected=new Date(issue+'T12:00:00Z');expected.setUTCDate(expected.getUTCDate()+15);assert.equal(await page.getByLabel('Válida hasta',{exact:true}).inputValue(),expected.toISOString().slice(0,10))
 await page.getByRole('button',{name:'Guardar cotización',exact:true}).click();await page.locator('.quote-product-image').waitFor();const id=page.url().split('/').at(-1)
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();const download=await downloading;assert.equal(await download.failure(),null);const pdf=readFileSync(await download.path(),'latin1');assert.ok(pdf.startsWith('%PDF-'));assert.ok(/\/I\d+ Do/.test(pdf));assert.ok(pdf.includes('Saldo contra entrega'));assert.ok(!pdf.includes('PRIVATE_PHOTO_NOTES'));assert.ok(!pdf.includes('(Borrador)'))
 await page.getByRole('button',{name:'Editar cotización',exact:true}).click();await page.locator('.product-image-preview img').waitFor();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.locator('.quote-product-image').waitFor();assert.ok((await call(owner,'/quotes/'+id)).items[0].image)
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Quote overflow at ${width}`)}
 assert.deepEqual(errors,[])
}finally{await browser.close()}
console.log('Products/conditions passed: validated photos, snapshots, historical editing, expiry defaults and overrides, long public conditions, tenant isolation, image deduplication and v1/v2/idempotent restore, product/quote uploads, PDF images and mobile layouts.')
