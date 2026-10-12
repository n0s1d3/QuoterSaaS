import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterQuotes,quoteExpiry } from '../src/lib/quote-search.ts'
import type { QuoteSummary } from '../src/lib/types.ts'
const q:QuoteSummary={id:'test',quoteNumber:'Q-0001',customerName:'Juan Pérez',status:'draft',issueDate:'2026-10-01',expiryDate:'2026-10-11',subtotal:100,tax:0,discount:0,total:100}
test('quote search ignores accents and date bounds are inclusive',()=>{
 const filters={search:'perez',status:'all',from:'2026-10-01',to:'2026-10-01',expired:true}
 assert.equal(filterQuotes([q],filters,'2026-10-12').length,1)
 assert.equal(filterQuotes([q],{...filters,search:'Q-0001'},'2026-10-12').length,1)
 assert.equal(filterQuotes([q],{...filters,from:'2026-10-02'},'2026-10-12').length,0)
})
test('expiry warning respects finalized status and seven-day boundary',()=>{
 assert.equal(quoteExpiry(q,'2026-10-12'),'Cotización vencida')
 assert.equal(quoteExpiry({...q,status:'accepted'},'2026-10-12'),'')
 assert.match(quoteExpiry({...q,expiryDate:'2026-10-19'},'2026-10-12'),/7 días/)
 assert.equal(quoteExpiry({...q,expiryDate:'2026-10-20'},'2026-10-12'),'')
})
