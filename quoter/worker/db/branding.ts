import {compactQuoteLayout} from '../../src/lib/custom-layout.ts'
export function captureBranding(db: D1Database, org: string, quoteId: string) {
  return db.prepare("UPDATE quotes SET branding_snapshot=(SELECT json_object('website',website,'name',name,'logo',logo,'primaryColor',primary_color,'accentColor',accent_color,'taxId',tax_id,'address',address,'phone',phone,'contactEmail',contact_email,'paymentTerms',payment_terms,'quoteTemplate',CASE WHEN custom_template_active=1 THEN 'custom' ELSE quote_template END,'customLayout',json(custom_layout),'quoteConditions',json(quote_conditions)) FROM organizations WHERE id=?), branding_captured_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=? AND organization_id=? AND deleted_at IS NULL").bind(org, quoteId, org)
}

/** Select a model and freeze its layout in the same transaction as quote writes. */
export function templateSnapshot(template:string,org:string){
 return template==='custom'?{
  sql:"json_set(branding_snapshot,'$.quoteTemplate',?,'$.customLayout',json(COALESCE(json_extract(branding_snapshot,'$.customLayout'),(SELECT custom_layout FROM organizations WHERE id=?),?)))",
  values:[template,org,JSON.stringify(compactQuoteLayout)],
 }:{sql:"json_set(branding_snapshot,'$.quoteTemplate',?)",values:[template]}
}
