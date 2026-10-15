// Never return provider output: it may include SQL, account data or secrets.
export function d1Diagnostic(result) {
 const output = String(result.stderr || '')+'\n'+String(result.stdout || '')
 const code = result.error?.code
 if (code === 'ENOBUFS') return 'output_limit'
 if (code === 'ENOENT') return 'runtime_missing'
 if (code === 'EACCES' || code === 'EPERM') return 'local_permissions'
 if (/foreign key constraint failed/i.test(output)) return 'foreign_key'
 if (/incomplete input|syntax error/i.test(output)) return 'sql_syntax'
 if (/no such table|no such column/i.test(output)) return 'schema_missing'
 if (/already exists|unique constraint failed/i.test(output)) return 'schema_conflict'
 if (/CHECK constraint failed|NOT NULL constraint failed/i.test(output)) return 'sql_constraint'
 if (/not authorized|SQLITE_AUTH|object name reserved for internal use/i.test(output)) return 'sql_restricted'
 if (/cannot start a transaction|cannot commit|storage\.transaction|SQLITE.*transaction/i.test(output)) return 'sql_transaction'
 if (/too many SQL variables|statement too long|SQLITE_TOOBIG|string or blob too big|too many terms in compound|query.*too large/i.test(output)) return 'sql_limit'
 if (/no such function/i.test(output)) return 'sql_function'
 if (/database is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(output)) return 'local_lock'
 if (/unknown arguments?|not enough non-option arguments/i.test(output)) return 'tool_arguments'
 if (/couldn.t find a D1|no D1 databases|configuration file|config.*not found/i.test(output)) return 'configuration'
 if (/SQLITE_FULL|database or disk is full|ENOSPC/i.test(output)) return 'storage_full'
 if (/EADDRINUSE|ECONNREFUSED|workerd|Miniflare|runtime failed/i.test(output)) return 'local_runtime'
 if (/permission denied|EACCES|EPERM/i.test(output)) return 'local_permissions'
 if (/certificate|ERR_SSL|ENOTFOUND|fetch failed|ETIMEDOUT/i.test(output)) return 'network'
 if (/SQLITE_ERROR|D1_ERROR/i.test(output)) return 'sql_error'
 return 'unclassified'
}
