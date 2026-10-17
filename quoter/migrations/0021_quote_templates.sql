ALTER TABLE organizations ADD COLUMN quote_template TEXT NOT NULL DEFAULT 'default'
CHECK (quote_template IN ('default', 'sidebar', 'minimal', 'corporate'));
