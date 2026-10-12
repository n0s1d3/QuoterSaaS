import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogAlert } from '../src/lib/catalog.ts'
import type { CatalogItem } from '../src/lib/types.ts'
const item:CatalogItem={id:'test',name:'Service',description:null,category:'Servicio',unit:'hora',unitPrice:100,duration:'1 hora',validUntil:null,reviewedAt:'2026-01-01',staleAfterDays:90,active:1}
test('stale and expired price alerts use configured review interval',()=>{
 assert.match(catalogAlert(item,'2026-10-12'),/antiguo/)
 assert.equal(catalogAlert({...item,reviewedAt:'2026-10-12'},'2026-10-12'),'')
 assert.match(catalogAlert({...item,validUntil:'2026-10-11'},'2026-10-12'),/vencido/)
 assert.equal(catalogAlert({...item,reviewedAt:'2026-10-12',validUntil:'2026-10-12'},'2026-10-12'),'')
})
