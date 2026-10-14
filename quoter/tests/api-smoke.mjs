import assert from 'node:assert/strict'
import { testAccount } from './auth-client.mjs'
const testUser = await testAccount()
const authFetch = testUser.request
const base = process.env.QUOTER_TEST_URL || 'http://127.0.0.1:5173'
async function call(path, data, status = 200) {
  const response = await authFetch(base + '/api' + path, data === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  assert.equal(response.status, status, await response.clone().text())
  return response.json()
}
await call('/customers',{name:'Juan Pérez',company:'JP Electric'},201)
await call('/customers',{name:'María López',company:'ML Designs'},201)
const customers = await call('/customers')
const customer = customers.find(c => c.name === 'Juan Pérez')
assert.ok(customer, 'Apply local seed first')
const item = { description: 'API smoke test', quantity: 1.005, unitPrice: 100, taxRate: 12 }
const input = { customerId: customer.id, issueDate: '2026-10-11', items: [item], discount: 0 }
for (const invalid of [
  { ...input, customerId: 'missing' }, { ...input, items: [] },
  { ...input, items: [{ ...item, description: '' }] },
  { ...input, items: [{ ...item, quantity: 0 }] },
  { ...input, items: [{ ...item, unitPrice: 1.1 }] },
  { ...input, items: [{ ...item, unitPrice: -1 }] },
  { ...input, discount: -1 }, { ...input, discount: 10000 },
  { ...input, issueDate: '2026-02-30' },
  { ...input, expiryDate: '2026-10-10' },
]) await call('/quotes', invalid, 400)
await call('/customers', { name: ' ', email: 'invalid' }, 400)
await call('/quotes/not-found', undefined, 404)
await call('/unknown', undefined, 404)
const before = await call('/quotes')
const quotes = await Promise.all(Array.from({ length: 6 }, () => call('/quotes', { ...input, total: 1, subtotal: 1, tax: 1 }, 201)))
assert.equal(new Set(quotes.map(q => q.quoteNumber)).size, 6)
const numbers = quotes.map(q => Number(q.quoteNumber.slice(2))).sort((a, b) => a - b)
assert.equal(numbers.at(-1) - numbers[0], 5)
for (const q of quotes) {
  assert.equal(q.subtotal, 101); assert.equal(q.tax, 0); assert.equal(q.total, 101)
  const detail = await call('/quotes/' + q.id)
  assert.equal(detail.items.length, 1); assert.equal(detail.customer.id, customer.id)
  assert.equal(detail.total, 101)
}
const after = await call('/quotes')
assert.equal(after.length, before.length + 6)
console.log('API smoke passed: 13 error cases, 6 concurrent quote saves, authoritative totals and retrieval. Test quotes remain in local D1.')

const changed = await call('/quotes/' + quotes[0].id)
const patch = await authFetch(base + '/api/quotes/' + changed.id, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'accepted'})})
assert.equal(patch.status,200);assert.equal((await patch.json()).status,'accepted')
const deletion = await authFetch(base + '/api/quotes/' + changed.id,{method:'DELETE'})
assert.equal(deletion.status,200);await call('/quotes/' + changed.id,undefined,404)
console.log('Status update and deletion passed')
const invalidStatus = await authFetch(base + '/api/quotes/' + quotes[1].id, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'invalid'})})
assert.equal(invalidStatus.status,400)
const originalBrand = await call('/branding')
const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII='
const brandSave = await authFetch(base + '/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...originalBrand,logo})})
assert.equal(brandSave.status,200);assert.equal((await call('/branding')).logo,logo)
await authFetch(base + '/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(originalBrand)})
console.log('Brand logo persistence and invalid status rejection passed')
const editTarget = quotes[1]
const updatedInput = { customerId: customers.find(c => c.name === 'María López').id, issueDate: '2026-10-12', expiryDate: '2026-10-30', notes: 'Edited quote', discount: 50, total: 999, items: [{description:'Replacement item',quantity:2,unitPrice:250,taxRate:12}] }
async function edit(data, expected = 200, id = editTarget.id) {
  const response = await authFetch(base + '/api/quotes/' + id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(data)})
  assert.equal(response.status,expected,await response.clone().text());return response.json()
}
await authFetch(base + '/api/quotes/' + editTarget.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'sent'})})
const edited = await edit(updatedInput)
assert.equal(edited.quoteNumber,editTarget.quoteNumber);assert.equal(edited.status,'sent');assert.equal(edited.id,editTarget.id)
assert.equal(edited.total,450);assert.equal(edited.tax,0);assert.equal(edited.items.length,1);assert.equal(edited.items[0].description,'Replacement item')
assert.equal(edited.customer.id,updatedInput.customerId);assert.equal(edited.notes,'Edited quote');assert.equal(edited.expiryDate,'2026-10-30')
await edit({...updatedInput,items:[]},400)
assert.equal((await call('/quotes/'+editTarget.id)).total,450)
await edit(updatedInput,404,'nonexistent')
console.log('Quote editing passed: identity/status preserved, items replaced, totals recalculated, invalid update leaves data intact')
const priorBrand = await call('/branding')
const snapshotBefore = await call('/quotes/' + quotes[2].id)
assert.ok(snapshotBefore.branding)
const newerBrand = {...priorBrand,name:'Snapshot test brand',primaryColor:'#112233',accentColor:'#ccddee',logo}
await authFetch(base+'/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(newerBrand)})
const snapshotNew = await call('/quotes',input,201)
assert.deepEqual(snapshotNew.branding,newerBrand)
assert.deepEqual((await call('/quotes/'+quotes[2].id)).branding,snapshotBefore.branding)
const refresh=await authFetch(base+'/api/quotes/'+quotes[2].id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({refreshBranding:true})})
assert.equal(refresh.status,200);assert.deepEqual((await refresh.json()).branding,newerBrand)
await authFetch(base+'/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(priorBrand)})
assert.deepEqual((await call('/quotes/'+snapshotNew.id)).branding,newerBrand)
console.log('Brand snapshots passed: new quotes capture all brand fields, existing ones preserve them until explicitly refreshed')
const catalogInput={name:'Tarifa de prueba',description:'Servicio de instalación',category:'Servicio',unit:'metro',unitPrice:2500,duration:'2 días',validUntil:'2026-12-31',staleAfterDays:60}
const template=await call('/catalog',catalogInput,201)
await call('/catalog',{...catalogInput,unitPrice:1.5},400)
const catalogQuote=await call('/quotes',{...input,discount:100,surchargeType:'percent',surchargeValue:1200,items:[{description:template.name,quantity:2,unitPrice:template.unitPrice,catalogItemId:template.id,unit:template.unit,duration:template.duration,validUntil:template.validUntil}]},201)
assert.equal(catalogQuote.subtotal,5000);assert.equal(catalogQuote.surcharge,588);assert.equal(catalogQuote.total,5488)
assert.equal(catalogQuote.items[0].unit,'metro');assert.equal(catalogQuote.items[0].duration,'2 días')
await authFetch(base+'/api/quotes/'+catalogQuote.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'accepted'})})
assert.equal((await call('/catalog')).find(i=>i.id===template.id).soldQuantity,2)
const updatedTemplate=await authFetch(base+'/api/catalog/'+template.id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...catalogInput,unitPrice:9000})})
assert.equal(updatedTemplate.status,200)
assert.equal((await call('/quotes/'+catalogQuote.id)).items[0].unitPrice,2500)
await authFetch(base+'/api/catalog/'+template.id,{method:'DELETE'})
assert.equal((await call('/catalog')).find(i=>i.id===template.id).active,0)
assert.equal((await call('/quotes/'+catalogQuote.id)).total,5488)
await call('/quotes',{...input,items:[{...item,catalogItemId:'missing'}]},400)
await call('/quotes',{...input,surchargeType:'fixed',surchargeValue:-1},400)
console.log('Catalog passed: validation, snapshots, accepted-quote ranking, archival, billing surcharge and invalid references')
