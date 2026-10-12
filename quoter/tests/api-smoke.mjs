import assert from 'node:assert/strict'
const base = process.env.QUOTER_TEST_URL || 'http://127.0.0.1:5173'
async function call(path, data, status = 200) {
  const response = await fetch(base + '/api' + path, data === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  assert.equal(response.status, status, await response.clone().text())
  return response.json()
}
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
const patch = await fetch(base + '/api/quotes/' + changed.id, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'accepted'})})
assert.equal(patch.status,200);assert.equal((await patch.json()).status,'accepted')
const deletion = await fetch(base + '/api/quotes/' + changed.id,{method:'DELETE'})
assert.equal(deletion.status,200);await call('/quotes/' + changed.id,undefined,404)
console.log('Status update and deletion passed')
const invalidStatus = await fetch(base + '/api/quotes/' + quotes[1].id, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'invalid'})})
assert.equal(invalidStatus.status,400)
const originalBrand = await call('/branding')
const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII='
const brandSave = await fetch(base + '/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...originalBrand,logo})})
assert.equal(brandSave.status,200);assert.equal((await call('/branding')).logo,logo)
await fetch(base + '/api/branding',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(originalBrand)})
console.log('Brand logo persistence and invalid status rejection passed')
