import { deflateSync } from 'node:zlib'
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
test('Long quotes and payment terms paginate and repeat letterhead',()=>{
  const long={...quote,items:Array.from({length:100},(_,i)=>({...quote.items[0],description:`Servicio ${i+1}: descripción extensa que ocupa varias líneas en la cotización y detalla el alcance del trabajo.`})),paymentTerms:'Condiciones adicionales. '.repeat(700)}
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

test('PDF excludes internal notes, preserves payment terms and does not mutate notes',()=>{
 const internal='INTERNAL_SECRET_CALL_CLIENT_3_DAYS',input={...quote,notes:internal,paymentTerms:'Efectivo, 50% de anticipo'}
 const output=createQuotePdf(input,brand).output()
 assert.ok(!output.includes(internal));assert.ok(!output.includes('NOTAS Y CONDICIONES'));assert.ok(output.includes('50% de anticipo'));assert.equal(input.notes,internal)
 const withoutTerms=createQuotePdf({...input,paymentTerms:null,notes:internal.repeat(500)},brand)
 assert.ok(!withoutTerms.output().includes(internal));assert.equal(withoutTerms.getNumberOfPages(),1)
})


test('Accepted multiline letterheads stay bounded and paginate complete business details',()=>{
 const address=Array.from({length:100},(_,index)=>`L${String(index+1).padStart(3,'0')}`).join('\n')
 const input={...quote,notes:'PRIVATE_NOTES_NEVER_PRINT',paymentTerms:'Public payment terms remain visible'}
 const doc=createQuotePdf(input,{...brand,name:'Business name '.repeat(15).trim(),address})
 const output=doc.output()
 assert.ok(doc.getNumberOfPages()>1);assert.ok(doc.getNumberOfPages()<12)
 assert.ok(output.includes('L100'))
 assert.ok(output.includes('Public payment terms remain visible'))
 assert.ok(!output.includes('PRIVATE_NOTES_NEVER_PRINT'))
 for(let page=1;page<=doc.getNumberOfPages();page++)assert.ok(doc.internal.pages[page].join('\n').includes('COTIZACI'))
})

for(const quoteTemplate of ['default','sidebar','minimal','corporate'] as const){
 test(`${quoteTemplate}: consistent amounts, privacy, repeated logo and complete pagination`,()=>{
  const input={...quote,notes:'PRIVATE_TEMPLATE_NOTES',paymentTerms:'Public payment conditions. '.repeat(150),items:Array.from({length:100},(_,i)=>({...quote.items[0],description:`Service ${i+1} description spanning multiple lines and defining the full scope of work.`}))}
  const original=JSON.stringify(input),events:string[]=[]
  const templateBrand={...brand,quoteTemplate}
  const pdf=createQuotePdf(input,{...templateBrand,logo:png()},event=>events.push(event)),output=pdf.output()
  assert.ok(output.includes('Service 100'));assert.ok(output.includes('Q 690.00'));assert.ok(output.includes('Public payment'));assert.ok(!output.includes(input.notes));assert.equal(JSON.stringify(input),original)
  assert.ok(pdf.getNumberOfPages()>2);assert.ok(pdf.getNumberOfPages()<60)
  for(let page=1;page<=pdf.getNumberOfPages();page++)assert.ok(pdf.internal.pages[page].join('\n').includes('(Empresa PDF)'))
  assert.throws(()=>createQuotePdf(quote,{...templateBrand,logo:'data:image/png;base64,invalid'}))
  assert.equal(events.filter(event=>event==='pdf.logo.incrustado').length,pdf.getNumberOfPages())
 })
}

function png(){
 function chunk(type:string,data:Buffer){const name=Buffer.from(type),bytes=Buffer.concat([name,data]);let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1}const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,bytes,tail])}
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=2
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,250,160,7]))),chunk('IEND',Buffer.alloc(0))]).toString('base64')
}
