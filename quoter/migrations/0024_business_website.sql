-- The destination belongs to each business and is captured with quote branding.
ALTER TABLE organizations ADD COLUMN website TEXT CHECK(website IS NULL OR length(website)<=2048);
