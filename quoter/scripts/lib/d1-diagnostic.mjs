// Never return provider output: it may include SQL, account data or secrets.
export function d1Diagnostic(result) {
 const output = String(result.stderr || '')
 const code = result.error?.code
 if (code === 'ENOBUFS') return 'output_limit'
 if (code === 'ENOENT') return 'runtime_missing'
 if (code === 'EACCES' || code === 'EPERM') return 'local_permissions'
 if (/foreign key constraint failed/i.test(output)) return 'foreign_key'
 if (/incomplete input|syntax error/i.test(output)) return 'sql_syntax'
 if (/no such table|no such column/i.test(output)) return 'schema_missing'
 if (/already exists|unique constraint failed/i.test(output)) return 'schema_conflict'
 if (/couldn.t find a D1|no D1 databases|configuration file|config.*not found/i.test(output)) return 'configuration'
 if (/SQLITE_FULL|database or disk is full|ENOSPC/i.test(output)) return 'storage_full'
 if (/EADDRINUSE|ECONNREFUSED|workerd|Miniflare|runtime failed/i.test(output)) return 'local_runtime'
 if (/permission denied|EACCES|EPERM/i.test(output)) return 'local_permissions'
 return 'unclassified'
}
