-- Keep the existing four-value quote_template CHECK intact. The custom layout
-- has its own selection flag and stores a validated, bounded configuration.
ALTER TABLE organizations ADD COLUMN custom_layout TEXT CHECK(custom_layout IS NULL OR (json_valid(custom_layout) AND json_type(custom_layout)='object'));
ALTER TABLE organizations ADD COLUMN custom_template_active INTEGER NOT NULL DEFAULT 0 CHECK(custom_template_active IN (0,1));
