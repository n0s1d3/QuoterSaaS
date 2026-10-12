ALTER TABLE quotes ADD COLUMN branding_snapshot TEXT;
ALTER TABLE quotes ADD COLUMN branding_captured_at TEXT;
-- Prior branding was not retained. Freeze the currently available brand for legacy quotes.
UPDATE quotes SET branding_snapshot = (SELECT json_object('name', name, 'logo', logo, 'primaryColor', primary_color, 'accentColor', accent_color) FROM organizations WHERE organizations.id = quotes.organization_id), branding_captured_at = CURRENT_TIMESTAMP;
