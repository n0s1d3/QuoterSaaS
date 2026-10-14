import { diagnosticEvent } from '../../src/lib/diagnostic-event'
import type { Account } from '../auth/session'
import { limit } from '../auth/rate-limit'
import { body, HttpError } from '../http'
export async function diagnostics(request: Request, db: D1Database, user: Account) {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  await limit(db, `diagnostics:${user.id}`, 120)
  const data = await body(request)
  if (!Array.isArray(data.events) || !data.events.length || data.events.length > 20) throw new HttpError(400, 'Invalid diagnostic events')
  const entries = data.events.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new HttpError(400, 'Invalid diagnostic event')
    const sanitized = diagnosticEvent(entry.event, entry.metadata)
    if (!sanitized) throw new HttpError(400, 'Invalid diagnostic event')
    return sanitized
  })
  console.info(JSON.stringify({ source: 'quoter.brand-pdf', organizationId: user.organizationId, time: new Date().toISOString(), events: entries }))
  return Response.json({ recorded: true })
}
