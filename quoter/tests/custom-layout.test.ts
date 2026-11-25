import {test} from 'node:test'
import assert from 'node:assert/strict'
import {jsPDF} from 'jspdf'
import {normalizeCustomLayout,resolveCustomLayout,compactQuoteLayout,layoutNumberFields} from '../src/lib/custom-layout.ts'
import {customHeaderGeometry} from '../src/lib/pdf-custom-header.ts'
import {createQuotePdf} from '../src/lib/quote-pdf.ts'
import {productPng} from './image-fixture.mjs'
test('custom layouts project supported settings and reject unsafe sizes, styles and boolean values',()=>{
 assert.deepEqual(resolveCustomLayout(null),compactQuoteLayout)
 assert.deepEqual(normalizeCustomLayout({logoSizeMm:18,html:'<script>never</script>'}),{...compactQuoteLayout,logoSizeMm:18})
 for(const input of [true,[],{baseTemplate:'custom'},{baseTemplate:'sidebar'},{logoPosition:'center'},{showLogo:'true'},{bodyFontSize:NaN},{headerPaddingMm:Infinity}])assert.throws(()=>normalizeCustomLayout(input))
 for(const field of layoutNumberFields){assert.throws(()=>normalizeCustomLayout({[field.key]:field.min-1}));assert.throws(()=>normalizeCustomLayout({[field.key]:field.max+1}));assert.throws(()=>normalizeCustomLayout({[field.key]:String(field.min)}))}
})
test('compact header uses less space, bounds the visible content and continues long data without exposing hidden fields',()=>{
 const doc=new jsPDF({unit:'mm'}),brand={name:'Mi negocio',logo:null,primaryColor:'#e85d04',accentColor:'#fff3e8',phone:'5555-0101',contactEmail:'venta@example.com'}
 const compact=customHeaderGeometry(doc,brand,compactQuoteLayout,{width:24,height:24})
 assert.ok(compact.bandBottom<58);assert.ok(compact.bodyTop<65);assert.ok(compact.bandBottom>=compact.logoY+24);assert.equal(compact.logoX+24,196)
 const long={...brand,name:'Empresa '.repeat(40),address:Array.from({length:100},(_,i)=>'L'+(i+1)).join('\n')}
 const layout={...compactQuoteLayout,headerMinHeightMm:18,headerPaddingMm:4,logoSizeMm:45,nameFontSize:24,contactFontSize:11}
 const geometry=customHeaderGeometry(doc,long,layout,{width:45,height:45})
 assert.ok(geometry.bandBottom>=49);assert.ok(geometry.continuedDetails.includes('L100'));assert.ok(geometry.bodyTop<120)
 const hidden=customHeaderGeometry(doc,long,{...layout,showBusinessName:false,showAddress:false})
 assert.deepEqual(hidden.nameLines,[]);assert.ok(!hidden.continuedDetails.includes('L100'))
})
for(const baseTemplate of ['default','minimal','corporate'] as const)for(const logoPosition of ['left','right'] as const){
 test(`custom ${baseTemplate}/${logoPosition}: complete pagination, logo links, authoritative totals and frozen input`,()=>{
  const brand={name:'Empresa personalizada',logo:productPng(),website:'https://example.com',primaryColor:'#e85d04',accentColor:'#fff3e8',quoteTemplate:'custom' as const,customLayout:{...compactQuoteLayout,baseTemplate,logoPosition,logoSizeMm:18,headerPaddingMm:4,headerMinHeightMm:24}}
  const quote={id:'custom-pdf',revision:0,quoteNumber:'Q-CUSTOM',customerName:'Cliente',status:'draft',issueDate:'2026-11-25',expiryDate:null,customer:{id:'customer',name:'Cliente',company:null,phone:null,email:null,taxId:null,address:null},notes:'PRIVATE_LAYOUT_NOTES',subtotal:10000,tax:0,discount:0,total:10000,paymentTerms:'Garantía: '+('Texto público completo. '.repeat(250)),items:Array.from({length:80},(_,i)=>({description:'Partida '+(i+1),quantity:1,unitPrice:125,taxRate:0,lineSubtotal:125,lineTax:0,lineTotal:125}))}
  const original=JSON.stringify({quote,brand}),pdf=createQuotePdf(quote,brand),output=pdf.output()
  assert.ok(output.includes('Partida 80'));assert.ok(output.includes('Q 100.00'));assert.ok(output.includes('Texto'));assert.ok(!output.includes('PRIVATE_LAYOUT_NOTES'));assert.ok(!output.includes('(Borrador)'));assert.equal((output.match(/\/Subtype \/Link/g)||[]).length,pdf.getNumberOfPages());assert.equal(JSON.stringify({quote,brand}),original)
  for(let page=1;page<=pdf.getNumberOfPages();page++)assert.ok(pdf.internal.pages[page].join('\n').includes('COTIZACI'))
  const hiddenPdf=createQuotePdf(quote,{...brand,name:'HIDDEN_LAYOUT_NAME',address:'HIDDEN_LAYOUT_ADDRESS',customLayout:{...brand.customLayout,showLogo:false,showBusinessName:false,showAddress:false}})
  const hidden=hiddenPdf.internal.pages.slice(1).map(page=>page.join('\n')).join('\n')
  assert.ok(!hidden.includes('(HIDDEN_LAYOUT_NAME)'));assert.ok(!hidden.includes('HIDDEN_LAYOUT_ADDRESS'));assert.ok(!hiddenPdf.output().includes('/Subtype /Link'))
 })
}
