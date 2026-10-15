import { mkdtempSync,mkdirSync,rmSync,renameSync,statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve,join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { backupKey,encryptSnapshot,decryptSnapshot,maxSnapshotBytes } from './lib/recovery.mjs'
const args=process.argv.slice(2),operation=args.shift(),options={}
for(let i=0;i<args.length;i++){const name=args[i];if(name==='--remote'){if(options.remote)throw new Error('Opción repetida');options.remote=true;continue}if(!['--file','--key-file','--output-dir'].includes(name)||!args[i+1]||args[i+1].startsWith('--')||options[name])throw new Error('Opciones inválidas');options[name]=args[++i]}
const keyFile=resolve(options['--key-file']||'.env.d1-backup-key.local')
if(operation==='key'){if(args.length)throw new Error('backup:key no recibe opciones');backupKey(keyFile,{create:true});console.log('Clave de respaldo privada preparada en .env.d1-backup-key.local. Consérvala fuera de Git y separada de los respaldos.');process.exit(0)}
if(!['backup','drill'].includes(operation))throw new Error('Operación: key, backup o drill')
if(operation==='backup'&&(!options.remote||options['--file']))throw new Error('El respaldo de producción requiere --remote explícito')
if(operation==='drill'&&(options.remote||!options['--file']||options['--output-dir']))throw new Error('El ensayo requiere --file y nunca acepta --remote ni un destino persistente')
const key=backupKey(keyFile),temp=mkdtempSync(join(tmpdir(),'quoter-recovery-')),sql=join(temp,'snapshot.sql'),wrangler=resolve('node_modules/wrangler/bin/wrangler.js')
function command(values){const result=spawnSync(process.execPath,[wrangler,...values],{encoding:'utf8',maxBuffer:1024*1024,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(temp,'wrangler.log'),WRANGLER_LOG_SANITIZE:'true'}});if(result.error||result.status!==0)throw new Error('Falló la operación D1; no se muestran SQL ni datos del respaldo. Comprueba autenticación, versión y permisos.');return result.stdout}
let partial
try{
 if(operation==='backup'){
  const directory=resolve(options['--output-dir']||'.backups');mkdirSync(directory,{recursive:true,mode:0o700});const name='quoter-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.qdb',destination=join(directory,name);partial=destination+'.partial'
  command(['d1','export','quoter-db','--remote','--skip-confirmation','--output',sql]);if(statSync(sql).size>maxSnapshotBytes)throw new Error('Exportación mayor de 128 MiB: utiliza recuperación D1 para bases mayores')
  await encryptSnapshot(sql,partial,key);renameSync(partial,destination);partial=undefined;console.log('Respaldo D1 cifrado creado: '+destination);console.log('No incluye los secretos del Worker. Conserva PASSWORD_PEPPER y MFA_ENCRYPTION_KEY por separado.')
 }else{
  await decryptSnapshot(resolve(options['--file']),sql,key)
  // Never restore to the real database. The destination is always a new local temporary state.
  const state=join(temp,'isolated-state')
  command(['d1','execute','quoter-db','--local','--persist-to',state,'--file',sql,'--json'])
  const output=command(['d1','execute','quoter-db','--local','--persist-to',state,'--command',"PRAGMA quick_check; PRAGMA foreign_key_check; SELECT COUNT(*) AS applied FROM d1_migrations WHERE name='0017_admin_mfa.sql'; SELECT COUNT(*) AS guards FROM sqlite_schema WHERE type='trigger' AND name IN('request_authorization','admin_mfa_write_guard','admin_mfa_reset');",'--json'])
  const results=JSON.parse(output);if(results.length!==4||results[0].results.length!==1||results[0].results[0].quick_check!=='ok'||results[1].results.length||results[2].results[0]?.applied!==1||results[3].results[0]?.guards!==3)throw new Error('La restauración no superó integridad, referencias o esquema requerido')
  console.log('Ensayo aprobado: descifrado autenticado, importación D1 local, integridad, referencias y esquema de seguridad. No se modificó producción. El estado temporal se elimina.')
 }
}finally{if(partial)rmSync(partial,{force:true});rmSync(temp,{recursive:true,force:true})}
