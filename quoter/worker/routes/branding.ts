import { isQuoteTemplate } from '../../src/lib/quote-templates.ts'
import { validateLogo } from '../../src/lib/raster'
import { body, HttpError, text } from '../http'
export async function branding(request: Request, db: D1Database, org: string) {
  if (request.method === 'PUT') {
    const data = await body(request)
    const name = text(data.name, 'Business name', true, 200)
    const logo = text(data.logo, 'Logo', false, 400000)
    try{await validateLogo(logo)}catch(e){throw new HttpError(400,(e as Error).message)}
    const primaryColor = text(data.primaryColor, 'Primary color', true)
    const accentColor = text(data.accentColor, 'Accent color', true)
    if (!/^#[a-fA-F0-9]{6}$/.test(primaryColor!) || !/^#[a-fA-F0-9]{6}$/.test(accentColor!)) throw new HttpError(400, 'Color inválido')
    const previous=await db.prepare('SELECT quote_template AS quoteTemplate,tax_id AS taxId,address,phone,contact_email AS contactEmail,payment_terms AS paymentTerms FROM organizations WHERE id=?').bind(org).first<Record<string,unknown>>()
    const field=(name:string)=>data[name]===undefined?previous?.[name]:data[name]
    const quoteTemplate=field('quoteTemplate') ?? 'default'
    if(!isQuoteTemplate(quoteTemplate))throw new HttpError(400,'Plantilla inválida')
    const taxId=text(field('taxId'),'NIT',false,100), address=text(field('address'),'Address',false,500), phone=text(field('phone'),'Phone',false,100), contactEmail=text(field('contactEmail'),'Email',false,254), paymentTerms=text(field('paymentTerms'),'Payment terms',false,2000)
    if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))throw new HttpError(400,'Correo del negocio inválido')
    await db.prepare('UPDATE organizations SET name=?,logo=?,primary_color=?,accent_color=?,tax_id=?,address=?,phone=?,contact_email=?,payment_terms=?,quote_template=? WHERE id=?').bind(name,logo,primaryColor,accentColor,taxId,address,phone,contactEmail,paymentTerms,quoteTemplate,org).run()
  } else if (request.method !== 'GET') throw new HttpError(405, 'Operación no permitida')
  return Response.json(await db.prepare('SELECT quote_template AS quoteTemplate, name, logo, primary_color AS primaryColor, accent_color AS accentColor,tax_id AS taxId,address,phone,contact_email AS contactEmail,payment_terms AS paymentTerms FROM organizations WHERE id=?').bind(org).first())
}
