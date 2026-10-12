import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateQuote } from '../src/lib/quote-calculator.ts'
import { formatMoney, toCents } from '../src/lib/money.ts'
test('example with tax and discount', () => {
  const quote = calculateQuote([{ description: 'Installation', quantity: 2, unitPrice: 35000, taxRate: 12 }], 1000)
  assert.deepEqual([quote.subtotal, quote.tax, quote.total], [70000, 8400, 77400])
})
test('half cents round up using decimal arithmetic', () => {
  const quote = calculateQuote([{ description: 'Fraction', quantity: 1.005, unitPrice: 100, taxRate: 0 }])
  assert.equal(quote.total, 101)
  assert.equal(calculateQuote([{ description: 'Tax', quantity: 1, unitPrice: 5, taxRate: 10 }]).tax, 1)
})
test('money input and formatting', () => {
  assert.equal(toCents('125.50'), 12550)
  assert.equal(formatMoney(125050), 'Q 1,250.50')
  assert.throws(() => toCents('1.001'))
})
test('invalid monetary values and negative totals rejected', () => {
  const item = { description: 'Item', quantity: 1, unitPrice: 100, taxRate: 12 }
  for (const change of [{ quantity: 0 }, { quantity: Infinity }, { unitPrice: 0.1 }, { taxRate: -1 }]) assert.throws(() => calculateQuote([{ ...item, ...change }]))
  assert.throws(() => calculateQuote([item], 113))
  assert.throws(() => calculateQuote([item], -1))
  assert.throws(() => calculateQuote([{ ...item, unitPrice: Number.MAX_SAFE_INTEGER }]))
})
