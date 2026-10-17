import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardMetrics,dashboardReminders } from '../src/lib/dashboard.ts'
import type { QuoteSummary } from '../src/lib/types.ts'
const quote: QuoteSummary = { id: 'q', quoteNumber: 'Q-0001', customerName: 'Cliente', status: 'draft', issueDate: '2026-10-01', subtotal: 100, total: 100, tax: 0, discount: 0 }
test('compact reminders always include upcoming deadlines alongside expired quotes',()=>{
  const expired=Array.from({length:4},(_,i)=>({...quote,id:'expired-'+i,expiryDate:'2026-10-01'})),upcoming=Array.from({length:4},(_,i)=>({...quote,id:'upcoming-'+i,expiryDate:'2026-10-20'}))
  assert.deepEqual(dashboardReminders({expired,upcoming:upcoming.slice(0,1)}).map(r=>r.quote.id),['expired-0','upcoming-0','expired-1','expired-2'])
  assert.deepEqual(dashboardReminders({expired,upcoming}).map(r=>r.quote.id),['expired-0','upcoming-0','expired-1','upcoming-1'])
  assert.equal(dashboardReminders({expired:[],upcoming}).length,4)
  assert.equal(dashboardReminders({expired,upcoming:[]}).length,4)
})
test('dashboard uses accepted totals and excludes rejected or expired potential amounts', () => {
  const result = dashboardMetrics([
    { ...quote, status: 'accepted', total: 1200, expiryDate: '2026-01-01' },
    { ...quote, status: 'sent', total: 300, expiryDate: '2026-10-13' },
    { ...quote, status: 'draft', total: 400 },
    { ...quote, status: 'sent', total: 500, expiryDate: '2026-10-12' },
    { ...quote, status: 'rejected', total: 900 },
  ], '2026-10-13')
  assert.equal(result.acceptedTotal, 1200)
  assert.equal(result.potentialTotal, 700)
  assert.equal(result.months.at(-1)?.accepted, 1200)
  assert.equal(result.months.at(-1)?.potential, 700)
  assert.equal(result.expired.length, 1)
  assert.equal(result.upcoming.length, 1)
})
test('dashboard counts unique categories per quote and manual items as uncategorized', () => {
  const result = dashboardMetrics([{ ...quote, categories: ['Servicio', 'Servicio', 'Producto'] }, { ...quote, categories: ['Servicio', 'Sin categoría'] }, { ...quote }], '2026-10-13')
  assert.deepEqual(Object.fromEntries(result.categories.map(c => [c.name, c.count])), { Servicio: 2, 'Sin categoría': 2, Producto: 1 })
})
test('dashboard months cross year boundaries and reminders exclude finalized quotes', () => {
  const result = dashboardMetrics([{ ...quote, issueDate: '2025-12-01', status: 'accepted', expiryDate: '2026-01-15' }, { ...quote, expiryDate: '2026-01-20' }, { ...quote, expiryDate: '2026-01-21' }], '2026-01-13')
  assert.equal(result.months[0].key, '2025-08')
  assert.equal(result.months[4].accepted, 100)
  assert.equal(result.months[5].key, '2026-01')
  assert.equal(result.upcoming.length, 1)
  const empty = dashboardMetrics([], '2026-01-13')
  assert.equal(empty.acceptedTotal, 0)
  assert.equal(empty.potentialTotal, 0)
  assert.deepEqual(empty.categories, [])
})
