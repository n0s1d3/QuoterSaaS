import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diagnosticEvent } from '../src/lib/diagnostic-event.ts'
test('diagnostics keep technical fields and drop images, customer data and raw errors', () => {
  assert.deepEqual(diagnosticEvent('pdf.error', { hasLogo: true, width: 640, format: 'PNG', customer: 'Private customer', logo: 'data:image/png;base64,secret', error: 'secret@example.com' }), { event: 'pdf.error', metadata: { hasLogo: true, width: 640, format: 'PNG' } })
})
test('diagnostics reject arbitrary events and unsafe values', () => {
  assert.equal(diagnosticEvent('private.customer', {}), null)
  assert.deepEqual(diagnosticEvent('logo.normalizado', { width: -1, height: Infinity, bytes: 'secret', type: 'secret@example.com', primaryColor: 'private', hasLogo: 'yes' }), { event: 'logo.normalizado', metadata: {} })
})
test('diagnostics preserve allowed brand and logo metadata', () => {
  const metadata = { hasBrand: true, hasLogo: false, logoCharacters: 0, primaryColor: '#4b1390', accentColor: '#ffffff', type: 'image/png', bytes: 415541 }
  assert.deepEqual(diagnosticEvent('marca.guardado.verificado', metadata), { event: 'marca.guardado.verificado', metadata })
})
