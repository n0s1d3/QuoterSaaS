ALTER TABLE organizations ADD COLUMN logo TEXT;
ALTER TABLE organizations ADD COLUMN primary_color TEXT NOT NULL DEFAULT '#24684f';
ALTER TABLE organizations ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#e9f3ed';
