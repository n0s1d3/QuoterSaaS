-- Optional product pictures are frozen on each saved quote line.
ALTER TABLE catalog_items ADD COLUMN image TEXT CHECK(image IS NULL OR length(image)<=60000);
ALTER TABLE quote_items ADD COLUMN image TEXT CHECK(image IS NULL OR length(image)<=60000);
-- Structured business defaults; existing quote payment_terms stay unchanged.
ALTER TABLE organizations ADD COLUMN quote_conditions TEXT CHECK(quote_conditions IS NULL OR (json_valid(quote_conditions) AND json_type(quote_conditions)='object'));
