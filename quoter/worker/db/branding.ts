export function captureBranding(db: D1Database, org: string, quoteId: string) {
  return db.prepare("UPDATE quotes SET branding_snapshot=(SELECT json_object('name',name,'logo',logo,'primaryColor',primary_color,'accentColor',accent_color,'taxId',tax_id,'address',address,'phone',phone,'contactEmail',contact_email,'paymentTerms',payment_terms,'quoteTemplate',quote_template) FROM organizations WHERE id=?), branding_captured_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=? AND organization_id=? AND deleted_at IS NULL").bind(org, quoteId, org)
}
