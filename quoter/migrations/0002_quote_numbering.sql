CREATE TABLE quote_sequences (organization_id TEXT PRIMARY KEY REFERENCES organizations(id), value INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX idx_quotes_number ON quotes(organization_id, quote_number);
