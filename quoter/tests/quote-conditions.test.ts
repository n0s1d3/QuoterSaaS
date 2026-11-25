import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeQuoteConditions,composeQuoteTerms,quoteExpiryDate} from '../src/lib/quote-conditions.ts'
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
