/** Classify failures without logging messages, SQL, parameters or credential material. */
export function errorDiagnostic(error:unknown){
 const message=String(error),schema=/no such (table|column):\s*(?:main\.)?["`]?([a-z_]+)/i.exec(message)
 if(schema){const allowed=new Set(['users','sessions','memberships','organizations','platform_admin','auth_limits','account_tokens','admin_mfa','admin_mfa_recovery','request_write_guards','email_verified_at','suspended_at','mfa_verified_until','mfa_factor_version']);return {category:'database_schema',...(allowed.has(schema[2])?{component:schema[2]}:{})}}
 if(/Cannot read properties of undefined.*(?:prepare|batch)/i.test(message))return {category:'database_binding'}
 if(/PBKDF2|deriveBits|iterations|NotSupportedError|OperationError/i.test(message))return {category:'crypto_runtime'}
 if(/D1_ERROR|D1_EXEC_ERROR/i.test(message))return {category:'database_failure'}
 return {category:'unexpected'}
}
