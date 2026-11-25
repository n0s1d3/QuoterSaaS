import {normalizeWebsite} from '../src/lib/website.ts'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeQuoteConditions,composeQuoteTerms,quoteExpiryDate,quoteTermSections} from '../src/lib/quote-conditions.ts'
import {validateProductImage} from '../src/lib/product-image.ts'
import {productPng} from './image-fixture.mjs'
test('structured conditions validate private input, preserve complete policies and compose public text without empty sections',()=>{
 const policy='Política de garantía: revisión y devolución. '.repeat(70)
 const conditions=normalizeQuoteConditions({paymentDeadline:' 50% anticipo ',paymentMethods:'Transferencia',bankTransfer:'Titular — Cuenta Monetaria 123 — Banco',deliveryTime:'24 a 48 horas',departmentShipping:'Cargo Expreso — Q40.00',warranty:'30 días',warrantyPolicy:policy,validityDays:15,advisorName:'Ana',advisorEmail:'ana@example.com',untrusted:'DROP THIS'})!
 const text=composeQuoteTerms('Término anterior',conditions)!
 assert.ok(text.startsWith('Término anterior'));assert.ok(text.includes(policy.trim()));assert.ok(text.includes('15 días'));assert.ok(text.includes('Q40.00'));assert.ok(!text.includes('undefined'));assert.ok(!('untrusted'in conditions));assert.equal(conditions.paymentDeadline,'50% anticipo')
 assert.equal(composeQuoteTerms('',null),null);assert.equal(quoteExpiryDate('2028-02-20',15),'2028-03-06');assert.equal(quoteExpiryDate('2026-12-25',15),'2027-01-09')
 for(const input of [[],true,{validityDays:0},{validityDays:1.5},{validityDays:'15'},{validityDays:3651},{advisorEmail:'not-email'},{warrantyPolicy:'x'.repeat(4001)},{paymentMethods:{raw:'x'}}])assert.throws(()=>normalizeQuoteConditions(input))
 assert.throws(()=>composeQuoteTerms('x'.repeat(12000),conditions),/superan/)
})
test('product pictures accept only complete bounded raster data, without external or SVG references',async()=>{
 await validateProductImage(productPng())
 for(const image of ['https://example.com/private.png','data:image/svg+xml;base64,PHN2Zy8+','data:image/png;base64,AA==','x'.repeat(60001),productPng(641,2)])await assert.rejects(()=>validateProductImage(image))
})

test('colon headings include custom labels while URL and time colons remain ordinary values',()=>{
 const text='Métodos de pago disponibles: Transferencia bancaria\nTiempo de entrega: 10 días hábiles (dependiendo del volumen de compra)\nEnvíos a departamentos: Por medio de Forza, Cargo Expreso o Guatex\nGarantía: 30 días por desperfectos de fabricación.\nReferencia comercial: REF-123\nhttps://example.com:8443/shop\n10:30 horas'
 const sections=quoteTermSections(text)
 assert.deepEqual(sections.map(row=>row.title),['Métodos de pago disponibles','Tiempo de entrega','Envíos a departamentos','Garantía','Referencia comercial'])
 assert.equal(sections[0].text,'Transferencia bancaria');assert.ok(sections[4].text.includes('https://example.com:8443/shop'));assert.ok(sections[4].text.includes('10:30 horas'))
 assert.deepEqual(quoteTermSections('Texto libre sin encabezado'),[{title:null,text:'Texto libre sin encabezado'}])
})
test('business website accepts only explicit HTTP(S) destinations without credentials or control characters',()=>{
 assert.equal(normalizeWebsite(' https://example.com '),'https://example.com/');assert.equal(normalizeWebsite('http://example.com/shop'),'http://example.com/shop');assert.equal(normalizeWebsite(null),null);assert.equal(normalizeWebsite(''),null)
 for(const input of ['javascript:alert(1)','data:text/html,hello','file:///tmp/foo','https://user:password@example.com','example.com','https://exam\nple.com','x'.repeat(2049),{}])assert.throws(()=>normalizeWebsite(input))
})
