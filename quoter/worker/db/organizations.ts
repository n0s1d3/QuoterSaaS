import { HttpError } from '../http'
export async function demoOrganization(db: D1Database) {
  const org = await db.prepare('SELECT id FROM organizations WHERE slug = ?').bind('demo').first<{id: string}>()
  if (!org) throw new HttpError(503, 'Demo organization missing. Apply migrations and seed data.')
  return org.id
}
