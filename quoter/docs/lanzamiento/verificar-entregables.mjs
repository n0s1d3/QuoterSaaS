// Checks the documentation and calculator only. No app, credentials or production.
import { readFileSync,readdirSync,existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve,dirname } from 'node:path'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const root=fileURLToPath(new URL('./entregables/',import.meta.url))
const executablePath=process.env.QUOTER_BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})})
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[],requests=[]
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)))
 page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>requests.push(r.url()))
 await page.setContent(readFileSync(root+'/calculadora-costos.html','utf8'))
 assert.ok((await page.locator('#gross').innerText()).includes('1,675'))
 assert.ok((await page.locator('#economic').innerText()).includes('69.69'))
 assert.equal(await page.locator('#breakEven').innerText(),'27')
 await page.locator('#businesses').fill('50');assert.ok((await page.locator('#economic').innerText()).includes('1,125.85'))
 await page.locator('#tax').fill('0');assert.equal(await page.locator('#breakEven').innerText(),'24')
 await page.locator('#marketing').fill('1000');assert.equal(await page.locator('#breakEven').innerText(),'31')
 await page.locator('#mix1').fill('0');await page.locator('#mix2').fill('0');await page.locator('#mix3').fill('0');assert.ok(await page.locator('#error').isVisible());assert.ok(await page.locator('#results').isHidden())
 await page.getByRole('button',{name:'Restablecer supuestos'}).click();await page.waitForFunction(()=>!document.getElementById('results').hidden);assert.equal(await page.locator('#breakEven').innerText(),'27')
 await page.locator('#fx').fill('');assert.ok(await page.locator('#results').isHidden());await page.locator('#fx').fill('7.70');assert.ok(await page.locator('#results').isVisible())
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'calculator overflow at '+width)}
 const files=readdirSync(root).filter(f=>f.endsWith('.html')&&!f.endsWith('.css.html'))
 for(const file of files){
  const doc=await context.newPage();await doc.setContent(readFileSync(root+'/'+file,'utf8'))
  const hrefs=await doc.locator('a[href]').evaluateAll(elements=>elements.map(a=>a.getAttribute('href')))
  for(const href of hrefs){if(!href||href.startsWith('#')||/^[a-z]+:/i.test(href))continue;const target=resolve(dirname(root+'/'+file),decodeURIComponent(href.split('#')[0]));assert.ok(existsSync(target),'broken link '+file+' -> '+href)}
  await doc.setViewportSize({width:375,height:900});assert.ok(await doc.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document overflow '+file)
  await doc.close()
 }
 const pdfs=readdirSync(root).filter(file=>file.endsWith('.pdf'));assert.equal(pdfs.length,9)
 for(const file of pdfs)assert.equal(readFileSync(root+'/'+file).subarray(0,5).toString(),'%PDF-')
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[])
 console.log('Documentation passed: '+files.length+' HTML documents, 9 PDF headers, local links, 375px layouts, calculator at 375/768/1440px, independent financial examples, reset/error handling, no browser errors or network requests.')
}finally{await browser.close()}
