// Documentation-only builder. Requires Pandoc and the existing Playwright browser.
// Does not start Quoter, call the API, read secrets or publish anything.
import { execFileSync } from 'node:child_process'
import { readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join,basename } from 'node:path'
import { chromium } from 'playwright'
const root=fileURLToPath(new URL('.',import.meta.url)),out=join(root,'entregables')
mkdirSync(out,{recursive:true})
const calculator=join(out,'calculadora-costos.html')
const financial=readFileSync(join(root,'modelo-financiero.mjs'),'utf8').replace('export function finance','function finance')
writeFileSync(calculator,readFileSync(calculator,'utf8').replace(/\/\* FINANCIAL_MODEL_START \*\/[\s\S]*?\/\* FINANCIAL_MODEL_END \*\//,'/* FINANCIAL_MODEL_START */\n'+financial+'\n/* FINANCIAL_MODEL_END */'))
const files=readdirSync(root).filter(name=>/^\d\d-.*\.md$/.test(name)).sort()
execFileSync('pandoc',['--version'],{stdio:'ignore'})
const navigation='<div class="doc-nav"><a href="index.html">Índice de documentación</a><span>Quoter · Guatemala · 19 oct 2026</span></div>'
for(const file of [...files,'README.md']){
 const source=join(root,file),name=file==='README.md'?'index':basename(file,'.md'),title=readFileSync(source,'utf8').split('\n')[0].replace(/^# /,'')
 let html=execFileSync('pandoc',[source,'--from=gfm','--to=html5','--standalone','--toc','--toc-depth=2','--metadata','lang=es-GT','--metadata','title='+title,'--include-in-header',join(out,'documentos.css.html')],{encoding:'utf8',maxBuffer:4*1024*1024})
 html=html.replace('<body>','<body>'+navigation).replace('</body>','<footer class="doc-footer">Quoter · Documento del 19 de octubre de 2026. Versión de referencia: base 44e2561 y periodos 0022; decisiones comerciales pendientes de aprobación. Material interno salvo los manuales de cliente destinados a su rol.</footer></body>')
 html=html.replace(/href="([^"#]+\.md)(#[^"]*)?"/g,(_,target,hash='')=>{
  if(/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//'))return `href="${target}${hash}"`
  const base=basename(target)
  if(files.includes(base)&&!target.includes('/'))return `href="${base.replace('.md','.html')}${hash}"`
  if(target.startsWith('../../'))return `href="../${target}${hash}"`
  return `href="../${target}${hash}"`
 })
 if(file==='README.md')html=html.replaceAll('href="entregables/','href="').replaceAll('href="costos-escenarios.csv"','href="../costos-escenarios.csv"')
 writeFileSync(join(out,name+'.html'),html)
}
const index=join(out,'index.html')
let indexHtml=readFileSync(index,'utf8')
const downloads='<section class="no-print"><h2>Archivos para descargar o imprimir</h2><ul>'+files.map(file=>{const name=basename(file,'.md');return `<li><a href="${name}.pdf">${readFileSync(join(root,file),'utf8').split('\n')[0].replace(/^# /,'')} · PDF</a></li>`}).join('')+'</ul><p><a href="calculadora-costos.html">Calculadora interactiva de costos</a> · <a href="../costos-escenarios.csv">Escenarios en CSV</a></p></section>'
indexHtml=indexHtml.replace('</header>','</header>'+downloads);writeFileSync(index,indexHtml)
if(!process.argv.includes('--solo-html')){
 const executablePath=process.env.QUOTER_BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})})
 try{
  const page=await browser.newPage()
  for(const file of files){const name=basename(file,'.md');await page.setContent(readFileSync(join(out,name+'.html'),'utf8'));await page.pdf({path:join(out,name+'.pdf'),format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-family:Arial;font-size:8px;color:#777;width:100%;margin:0 18mm;display:flex;justify-content:space-between"><span>Quoter · 19 octubre 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',margin:{top:'16mm',bottom:'18mm',left:'15mm',right:'15mm'}})}
 }finally{await browser.close()}
}
console.log('Generados '+files.length+' documentos HTML'+(process.argv.includes('--solo-html')?'':' y PDF')+' e índice. No se modificó producción.')
