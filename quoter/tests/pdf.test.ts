import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createQuotePdf } from '../src/lib/quote-pdf.ts'
import type { Branding, QuoteDetail } from '../src/lib/types.ts'
const brand: Branding = { name: 'Empresa PDF', logo: null, primaryColor: '#24684f', accentColor: '#e9f3ed' }
const quote: QuoteDetail = { id:'pdf-test',quoteNumber:'Q-0042',status:'sent',customerName:'Juan Pérez',issueDate:'2026-10-12',expiryDate:'2026-10-26',customer:{id:'customer',name:'Juan Pérez',company:'JP Electric',phone:'5555-1111',email:'juan@example.com',address:null,taxId:null},items:[{description:'Instalación eléctrica',quantity:2,unitPrice:35000,taxRate:0,lineSubtotal:70000,lineTax:0,lineTotal:70000}],subtotal:70000,tax:0,discount:1000,total:69000,notes:'Pago al finalizar.' }
test('PDF uses company and authoritative quote totals without mutating input',()=>{
  const original=JSON.stringify(quote);const doc=createQuotePdf(quote,brand);const output=doc.output()
  assert.ok(output.startsWith('%PDF-'));assert.ok(output.includes('Empresa PDF'));assert.ok(output.includes('Q-0042'));assert.ok(output.includes('Q 690.00'));assert.equal(doc.getNumberOfPages(),1);assert.equal(JSON.stringify(quote),original)
})
test('Long quotes and notes paginate and repeat letterhead',()=>{
  const long={...quote,items:Array.from({length:100},(_,i)=>({...quote.items[0],description:`Servicio ${i+1}: descripción extensa que ocupa varias líneas en la cotización y detalla el alcance del trabajo.`})),notes:'Condiciones adicionales. '.repeat(700)}
  const doc=createQuotePdf(long,brand);assert.ok(doc.getNumberOfPages()>3)
  for (let page = 1; page <= doc.getNumberOfPages(); page++) assert.ok(doc.internal.pages[page].join('\n').includes('(Empresa PDF)'), `Missing letterhead on page ${page}`)
})
test('Invalid logo causes a visible generation failure',()=>{
  assert.throws(()=>createQuotePdf(quote,{...brand,logo:'data:image/png;base64,invalid'}))
})
test('PDF includes complete business letterhead and saved payment conditions',()=>{
 const doc=createQuotePdf({...quote,paymentTerms:'50% anticipo; 50% al entregar.'},{...brand,taxId:'12345-K',address:'Guatemala',phone:'5555-1010',contactEmail:'business@example.com'})
 const output=doc.output();for(const value of ['12345-K','Guatemala','5555-1010','business@example.com','50% anticipo'])assert.ok(output.includes(value))
})
