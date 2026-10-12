export function captureBranding(db: D1Database, org: string, quoteId: string) {
  return db.prepare("UPDATE quotes SET branding_snapshot=(SELECT json_object('name',name,'logo',logo,'primaryColor',primary_color,'accentColor',accent_color) FROM organizations WHERE id=?), branding_captured_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?").bind(org, quoteId, org)
}
