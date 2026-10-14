CREATE TABLE backup_customer_aliases (
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 source_id TEXT NOT NULL,
 customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 PRIMARY KEY(organization_id,source_id)
);
CREATE INDEX backup_customer_alias_target ON backup_customer_aliases(organization_id,customer_id);
