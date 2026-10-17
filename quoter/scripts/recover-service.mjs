import { mkdtempSync,rmSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { backupKey,decryptSnapshot } from './lib/recovery.mjs'
import { recoveryRuntime,restoreSnapshotInto } from './lib/restore-parameterized.mjs'
import { snapshotHash,validateRecoveryIdentity,readRecoveryPlan,privateJson,recoveryApi,createReplacement,verifyServiceDatabase,migrationsFingerprint,recoveryMigrationsDirectory } from './lib/recover-service.mjs'

const args=process.argv.slice(2),operation=args.shift(),options={}
for(let i=0;i<args.length;i++){
 const name=args[i]
 if(name==='--custody-confirmed'){if(options[name])throw new Error('Opción repetida');options[name]=true;continue}
 if(!['--file','--key-file','--account','--name','--out','--plan','--confirm-name'].includes(name)||options[name]||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Opciones inválidas')
 options[name]=args[++i]
}
const temp=mkdtempSync(join(tmpdir(),'quoter-replace-')),sql=join(temp,'snapshot.sql')
try{
 if(operation==='plan'){
  if(options['--plan']||options['--confirm-name']||!options['--file']||!options['--out']||!options['--custody-confirmed'])throw new Error('Plan: --file --account --name quoter-recovery-* --out --custody-confirmed; no realiza conexiones ni cambios remotos')
  validateRecoveryIdentity(options['--account'],options['--name'])
  const snapshot=resolve(options['--file']),keyFile=resolve(options['--key-file']||'.env.d1-backup-key.local'),hash=snapshotHash(snapshot)
  await decryptSnapshot(snapshot,sql,backupKey(keyFile))
  const runtime=recoveryRuntime(join(temp,'rehearsal'))
  try{const db=await runtime.getD1Database('DB');await restoreSnapshotInto(sql,db,{revokeAccess:true,upgradeMigrations:recoveryMigrationsDirectory});await verifyServiceDatabase(db)}finally{await runtime.dispose()}
  privateJson(resolve(options['--out']),{format:1,operation:'create-new-d1-only',createdAt:new Date().toISOString(),account:options['--account'],name:options['--name'],snapshot,keyFile,snapshotHash:hash,migrationsFingerprint:migrationsFingerprint(),custodyConfirmed:true,revocations:['sessions','account_tokens','admin_mfa_recovery'],changesBindings:false})
  console.log('Plan aprobado localmente: D1 nueva, importación parametrizada, integridad y revocación de credenciales. No se conectó a Cloudflare. Revisar el plan privado antes de apply.')
 }else if(operation==='apply'){
  if(Object.keys(options).some(name=>!['--plan','--confirm-name'].includes(name))||!options['--plan']||!options['--confirm-name'])throw new Error('Apply exige únicamente --plan y --confirm-name; no acepta ID de una base existente')
  const planPath=resolve(options['--plan']),plan=readRecoveryPlan(planPath)
  if(options['--confirm-name']!==plan.name)throw new Error('El nombre confirmado no coincide con el destino nuevo del plan')
  await decryptSnapshot(plan.snapshot,sql,backupKey(plan.keyFile))
  const api=recoveryApi(plan.account,process.env.CLOUDFLARE_API_TOKEN)
  await createReplacement(plan,sql,api,planPath)
  console.log('D1 NUEVA recuperada y verificada. Sesiones, enlaces y códigos MFA de recuperación anteriores revocados. No se cambiaron bindings ni secretos. Revisar recibo y binding-review privados antes de publicar.')
 }else throw new Error('Operación: plan o apply; plan es el ensayo sin red, apply crea exclusivamente una D1 nueva')
}finally{rmSync(temp,{recursive:true,force:true,maxRetries:5})}
