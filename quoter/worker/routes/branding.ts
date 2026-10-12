import { body, HttpError, text } from '../http'
export async function branding(request: Request, db: D1Database, org: string) {
  if (request.method === 'PUT') {
    const data = await body(request)
    const name = text(data.name, 'Business name', true, 200)
    const logo = text(data.logo, 'Logo', false, 400000)
    if (logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) throw new HttpError(400, 'Use a PNG, JPEG or WebP logo')
    const primaryColor = text(data.primaryColor, 'Primary color', true)
    const accentColor = text(data.accentColor, 'Accent color', true)
    if (!/^#[a-fA-F0-9]{6}$/.test(primaryColor!) || !/^#[a-fA-F0-9]{6}$/.test(accentColor!)) throw new HttpError(400, 'Invalid color')
    await db.prepare('UPDATE organizations SET name=?, logo=?, primary_color=?, accent_color=? WHERE id=?').bind(name, logo, primaryColor, accentColor, org).run()
  } else if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed')
  return Response.json(await db.prepare('SELECT name, logo, primary_color AS primaryColor, accent_color AS accentColor FROM organizations WHERE id=?').bind(org).first())
}
