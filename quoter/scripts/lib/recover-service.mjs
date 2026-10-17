import { createHash } from 'node:crypto'
import { readFileSync,writeFileSync,readdirSync } from 'node:fs'
import { join,dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { privateFile } from './private-file.mjs'

export const snapshotHash=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
export const recoveryMigrationsDirectory=fileURLToPath(new URL('../../migrations/',import.meta.url))
export function migrationsFingerprint(){
 const hash=createHash('sha256')
 for(const name of readdirSync(recoveryMigrationsDirectory).filter(name=>/^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort())hash.update(name+'\0').update(readFileSync(join(recoveryMigrationsDirectory,name)))
 return hash.digest('hex')
}
export function validateRecoveryIdentity(account,name){
 if(!/^[a-f0-9]{32}$/i.test(account)||!/^quoter-recovery-[a-z0-9][a-z0-9-]{4,50}$/.test(name))throw new Error('Account ID o nombre inválido; el destino debe llamarse quoter-recovery-*')
}
export function readRecoveryPlan(file){
 privateFile(file);const plan=JSON.parse(readFileSync(file,'utf8'))
 validateRecoveryIdentity(plan.account,plan.name)
 if(plan.format!==1||plan.operation!=='create-new-d1-only'||plan.custodyConfirmed!==true||!/^[a-f0-9]{64}$/.test(plan.snapshotHash)||typeof plan.snapshot!=='string'||typeof plan.keyFile!=='string'||!Number.isFinite(Date.parse(plan.createdAt))||Date.now()-Date.parse(plan.createdAt)>86400000||Date.parse(plan.createdAt)>Date.now()+60000)throw new Error('Plan inválido o vencido; genera otro plan local')
 if(snapshotHash(plan.snapshot)!==plan.snapshotHash)throw new Error('El respaldo cambió desde el plan; no se creó ninguna D1')
 if(plan.migrationsFingerprint!==migrationsFingerprint())throw new Error('Las migraciones cambiaron desde el ensayo; genera otro plan antes de crear la D1')
 return plan
}
export function privateJson(file,value){writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});privateFile(file)}

// Only this fixed API origin is permitted. No destination database ID is ever
// accepted from a CLI/plan: apply obtains it solely from a successful CREATE.
export function recoveryApi(account,token,request=fetch){
 if(!/^[a-f0-9]{32}$/i.test(account)||!token?.trim())throw new Error('Falta Account ID o CLOUDFLARE_API_TOKEN de operador')
 return async(path,{method='GET',body}={})=>{
  let response,value
  try{
   response=await request('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database'+path,{method,redirect:'error',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
   if(!response.ok)throw new Error('API status')
   value=await response.json()
  }catch{throw new Error('Falló la API D1 de recuperación; no se muestran token, SQL ni respuesta privada. Verifica credenciales, cuota y conexión')}
  if(value?.success!==true||!('result' in value))throw new Error('La API D1 rechazó la recuperación; se ocultan sus detalles privados')
  return value.result
 }
}
export function remoteRecoveryDatabase(api,id){
 if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('ID nuevo inválido')
 return {prepare(sql){let params=[];const statement={bind(...values){params=values;return statement},async all(){const values=await api('/'+id+'/query',{method:'POST',body:{sql,params}});if(!Array.isArray(values)||values.length!==1||values[0].success===false)throw new Error('Respuesta D1 inesperada');return {results:values[0].results}},async first(){return (await statement.all()).results[0]??null},async run(){return statement.all()}};return statement}}
}
export async function verifyServiceDatabase(db){
 const integrity=await db.prepare('PRAGMA quick_check').all(),references=await db.prepare('PRAGMA foreign_key_check').all()
 const migrations=await db.prepare("SELECT COUNT(*) AS n FROM d1_migrations WHERE name='0017_admin_mfa.sql'").first(),guards=await db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='trigger' AND name IN('request_authorization','admin_mfa_write_guard','admin_mfa_reset')").first()
 if(integrity.results.length!==1||integrity.results[0].quick_check!=='ok'||references.results.length||migrations.n!==1||guards.n!==3)throw new Error('La base de reemplazo no superó integridad, referencias o esquema')
 for(const table of ['sessions','account_tokens','admin_mfa_recovery'])if((await db.prepare('SELECT COUNT(*) AS n FROM '+table).first()).n!==0)throw new Error('La base de reemplazo conserva credenciales que deben revocarse')
}

export async function createReplacement(plan,sql,api,planPath){
 validateRecoveryIdentity(plan.account,plan.name)
 const listed=await api('?name='+encodeURIComponent(plan.name)+'&per_page=100')
 if(!Array.isArray(listed)||listed.some(entry=>entry.name===plan.name))throw new Error('El nombre destino ya existe o no pudo comprobarse; no se reutiliza ninguna D1 existente')
 const receipt=join(dirname(planPath),plan.name+'-receipt.json'),binding=join(dirname(planPath),plan.name+'-binding-review.json')
 // Reserve receipt before CREATE so retry cannot orphan another database.
 privateJson(receipt,{status:'creating',account:plan.account,name:plan.name,createdAt:new Date().toISOString(),bindingChanged:false})
 const created=await api('',{method:'POST',body:{name:plan.name}}),id=created?.uuid
 if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Cloudflare no devolvió una ID nueva válida; revisa las D1 quoter-recovery-* del panel')
 writeFileSync(receipt,JSON.stringify({status:'importing',account:plan.account,name:plan.name,databaseId:id,bindingChanged:false},null,2)+'\n',{mode:0o600})
 const db=remoteRecoveryDatabase(api,id),{restoreSnapshotInto}=await import('./restore-parameterized.mjs')
 await restoreSnapshotInto(sql,db,{revokeAccess:true,upgradeMigrations:recoveryMigrationsDirectory});await verifyServiceDatabase(db)
 privateJson(binding,{d1_databases:[{binding:'DB',database_name:plan.name,database_id:id}],requiredDuringReview:{MAINTENANCE_READ_ONLY:'true'},warning:'Fragmento para revisión manual; no cambia Worker, bindings ni secretos. Conciliar contraseñas/MFA/permisos/pagos antes de reabrir.'})
 writeFileSync(receipt,JSON.stringify({status:'verified-not-published',account:plan.account,name:plan.name,databaseId:id,bindingChanged:false,revocations:['sessions','account_tokens','admin_mfa_recovery'],verifiedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600})
 return {databaseId:id,receipt,binding}
}
