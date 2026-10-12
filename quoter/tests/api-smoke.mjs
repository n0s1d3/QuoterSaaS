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
  { ...input, items: [{ ...item, taxRate: -1 }] },
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
  assert.equal(q.subtotal, 101); assert.equal(q.tax, 12); assert.equal(q.total, 113)
  const detail = await call('/quotes/' + q.id)
  assert.equal(detail.items.length, 1); assert.equal(detail.customer.id, customer.id)
  assert.equal(detail.total, 113)
}
const after = await call('/quotes')
assert.equal(after.length, before.length + 6)
console.log('API smoke passed: 13 error cases, 6 concurrent quote saves, authoritative totals and retrieval. Test quotes remain in local D1.')
