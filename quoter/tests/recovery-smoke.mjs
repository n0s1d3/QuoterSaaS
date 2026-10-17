import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,existsSync,readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import { encryptSnapshot,decryptSnapshot } from '../scripts/lib/recovery.mjs'
import { createReplacement,recoveryApi,readRecoveryPlan } from '../scripts/lib/recover-service.mjs'
import { recoveryRuntime,restoreParameterized } from '../scripts/lib/restore-parameterized.mjs'
const temp=mkdtempSync(join(tmpdir(),'quoter-recovery-smoke-')),sql=join(temp,'source.sql'),encrypted=join(temp,'source.qdb'),keyFile=join(temp,'key'),wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(temp,'wrangler.log')}
// Use an authentic old-schema snapshot to prove service recovery upgrades it.
const fixtureMigrations=join(temp,'fixture-migrations');mkdirSync(fixtureMigrations)
for(const name of readdirSync('migrations').filter(name=>/^00(0[1-9]|1[0-7])_/.test(name)))writeFileSync(join(fixtureMigrations,name),readFileSync(join('migrations',name)))
const config=join(temp,'wrangler.json');writeFileSync(config,JSON.stringify({name:'recovery-fixture',compatibility_date:'2026-10-01',d1_databases:[{binding:'DB',database_name:'quoter-db',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:fixtureMigrations}]}))
function command(values){if(values[0]===wrangler)values.push('--config',config);const result=spawnSync(process.execPath,values,{encoding:'utf8',env,maxBuffer:1024*1024});assert.equal(result.status,0,'Isolated D1 recovery operation failed: '+result.stderr.slice(0,1000));return result.stdout}
try{
 command([wrangler,'d1','migrations','apply','quoter-db','--local'])
 const fixture="INSERT INTO organizations(id,name,slug) VALUES('recover-org','Recovery fixture','recover-org'); INSERT INTO users(id,organization_id,email,password_hash,password_salt,email_verified_at) VALUES('recover-user','recover-org','recover@example.com','test-digest','test-salt',CURRENT_TIMESTAMP); INSERT INTO memberships(user_id,organization_id,role) VALUES('recover-user','recover-org','owner'); INSERT INTO customers(id,organization_id,name) VALUES('recover-client','recover-org','PRIVATE_RECOVERY_CLIENT'); INSERT INTO quotes(id,organization_id,customer_id,quote_number,issue_date,subtotal,total,notes) VALUES('recover-quote','recover-org','recover-client','Q-0001','2026-10-14',12345,12345,'PRIVATE_RECOVERY_NOTE'); INSERT INTO quote_items(id,quote_id,description,quantity,unit_price,line_subtotal,line_total) VALUES('recover-item','recover-quote','Private fixture service',1,12345,12345,12345); INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES('fixture-session','recover-user','recover-org',unixepoch()+1000); INSERT INTO admin_mfa(user_id,version,sealed_secret,enabled_at) VALUES('recover-user','fixture-version','ENCRYPTED_FACTOR_FIXTURE',CURRENT_TIMESTAMP); INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES('fixture-reset-token','recover-user','reset',unixepoch()+1000); INSERT INTO admin_mfa_recovery(user_id,code_hash) VALUES('recover-user','fixture-recovery-code');"
 command([wrangler,'d1','execute','quoter-db','--local','--command',fixture,'--json'])
 // Reproduce D1's SQL-text limit with a large logo and frozen quote branding.
 const logo='data:image/png;base64,'+'ABCD'.repeat(100000),brand=JSON.stringify({name:"Marca 'de prueba'; áéí",logo,primaryColor:'#4b1390',accentColor:'#ffffff'})
 const sourceRuntime=recoveryRuntime(join(temp,'.wrangler/state'));try{
  const sourceD1=await sourceRuntime.getD1Database('DB');assert.equal((await sourceD1.prepare('SELECT count(*) AS n FROM organizations').first()).n,1)
  await sourceD1.prepare("UPDATE organizations SET logo=? WHERE id='recover-org'").bind(logo).run()
  await sourceD1.prepare("UPDATE quotes SET branding_snapshot=? WHERE id='recover-quote'").bind(brand).run()
 }finally{await sourceRuntime.dispose()}
 command([wrangler,'d1','export','quoter-db','--local','--output',sql])
 const key=randomBytes(32);writeFileSync(keyFile,key.toString('hex'),{mode:0o600});await encryptSnapshot(sql,encrypted,key);assert.ok(!readFileSync(encrypted).includes(Buffer.from('PRIVATE_RECOVERY_CLIENT')))
 const output=command(['scripts/db-recovery.mjs','drill','--file',encrypted,'--key-file',keyFile]);assert.ok(output.includes('Ensayo aprobado'));assert.ok(output.includes('valores parametrizados'))
 const parameterState=join(temp,'parameter-proof');await restoreParameterized(sql,parameterState)
 const restoredRuntime=recoveryRuntime(parameterState);try{
  const restored=await restoredRuntime.getD1Database('DB');assert.equal((await restored.prepare("SELECT logo FROM organizations WHERE id='recover-org'").first()).logo,logo);assert.equal((await restored.prepare("SELECT branding_snapshot FROM quotes WHERE id='recover-quote'").first()).branding_snapshot,brand)
  await assert.rejects(()=>restored.prepare("INSERT INTO request_write_guards VALUES('bad','missing','missing','missing',0)").run(),/QUOTER_SESSION_REVOKED/)
 }finally{await restoredRuntime.dispose()}
 // Offline executable replacement plan: same encrypted source, large values,
 // and a real D1-backed fake API. No production account or network is used.
 const planFile=join(temp,'recovery-plan.json'),account='a'.repeat(32),target='quoter-recovery-fixture'
 const planOutput=command(['scripts/recover-service.mjs','plan','--file',encrypted,'--key-file',keyFile,'--account',account,'--name',target,'--out',planFile,'--custody-confirmed'])
 assert.ok(planOutput.includes('Plan aprobado localmente'));const plan=readRecoveryPlan(planFile)
 assert.equal(plan.changesBindings,false);assert.ok(!readFileSync(planFile,'utf8').includes(key.toString('hex')))
 const replacementRuntime=recoveryRuntime(join(temp,'replacement-proof')),createdId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',calls=[]
 try{
  const replacement=await replacementRuntime.getD1Database('DB');let created=false
  const api=recoveryApi(account,'PRIVATE_OPERATOR_FIXTURE_TOKEN',async(input,options)=>{
   const url=new URL(input);assert.equal(url.origin,'https://api.cloudflare.com');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,'Bearer PRIVATE_OPERATOR_FIXTURE_TOKEN');calls.push({path:url.pathname,method:options.method})
   let value
   if(options.method==='GET')value=created?[{name:target,uuid:createdId}]:[]
   else if(!url.pathname.endsWith('/query')){assert.deepEqual(JSON.parse(options.body),{name:target});assert.equal(created,false);created=true;value={uuid:createdId}}
   else{assert.ok(url.pathname.endsWith('/'+createdId+'/query'));const body=JSON.parse(options.body);assert.ok(!body.sql.includes(logo));const response=await replacement.prepare(body.sql).bind(...body.params).all();value=[response]}
   return Response.json({success:true,result:value})
  })
  const result=await createReplacement(plan,sql,api,planFile)
  assert.equal(result.databaseId,createdId);assert.equal((await replacement.prepare("SELECT logo FROM organizations WHERE id='recover-org'").first()).logo,logo);assert.equal((await replacement.prepare("SELECT branding_snapshot FROM quotes WHERE id='recover-quote'").first()).branding_snapshot,brand)
  for(const table of ['sessions','account_tokens','admin_mfa_recovery'])assert.equal((await replacement.prepare('SELECT count(*) AS n FROM '+table).first()).n,0)
  assert.equal((await replacement.prepare('SELECT count(*) AS n FROM users').first()).n,1)
  assert.equal((await replacement.prepare("SELECT count(*) AS n FROM d1_migrations WHERE name IN ('0018_auth_cleanup.sql','0019_backup_validation.sql','0020_plan_schedule.sql','0021_quote_templates.sql')").first()).n,4)
  assert.equal((await replacement.prepare('SELECT count(*) AS n FROM backup_restore_images').first()).n,0)
  const receipt=JSON.parse(readFileSync(result.receipt,'utf8'));assert.equal(receipt.status,'verified-not-published');assert.equal(receipt.bindingChanged,false)
  assert.equal(JSON.parse(readFileSync(result.binding,'utf8')).requiredDuringReview.MAINTENANCE_READ_ONLY,'true')
  await assert.rejects(()=>createReplacement(plan,sql,api,planFile),/ya existe/)
  assert.equal(calls.filter(call=>call.method==='POST'&&!call.path.endsWith('/query')).length,1)
  const wrongTarget=spawnSync(process.execPath,['scripts/recover-service.mjs','apply','--plan',planFile,'--confirm-name','quoter-recovery-wrong'],{encoding:'utf8',env});assert.notEqual(wrongTarget.status,0);assert.ok(wrongTarget.stderr.includes('no coincide'))
  const unsafe=spawnSync(process.execPath,['scripts/recover-service.mjs','apply','--plan',planFile,'--confirm-name',target,'--database-id',createdId],{encoding:'utf8',env});assert.notEqual(unsafe.status,0)
 }finally{await replacementRuntime.dispose()}
 const invalidReferences=join(temp,'invalid-references.sql');writeFileSync(invalidReferences,"CREATE TABLE parent(id TEXT PRIMARY KEY); CREATE TABLE child(id TEXT REFERENCES parent(id)); INSERT INTO child VALUES('PRIVATE_DANGLING_REFERENCE');")
 await assert.rejects(()=>restoreParameterized(invalidReferences,join(temp,'rejected-reference-state')),error=>error.message.includes('categoria=foreign_key')&&!error.message.includes('PRIVATE_DANGLING_REFERENCE'))
 // Real Wrangler --json writes its error to stdout, not stderr.
 const badSql=join(temp,'invalid.sql'),badSnapshot=join(temp,'invalid.qdb');writeFileSync(badSql,'INVALID_PRIVATE_FIXTURE_SQL;');await encryptSnapshot(badSql,badSnapshot,key)
 const badImport=spawnSync(process.execPath,['scripts/db-recovery.mjs','drill','--file',badSnapshot,'--key-file',keyFile],{encoding:'utf8',env});assert.notEqual(badImport.status,0);assert.ok(badImport.stderr.includes('etapa=import, categoria=sql_syntax'),badImport.stderr);assert.ok(!badImport.stderr.includes('INVALID_PRIVATE_FIXTURE_SQL'))
 const decoded=join(temp,'decoded.sql');await decryptSnapshot(encrypted,decoded,key)
 const db=new DatabaseSync(':memory:');try{db.exec(readFileSync(decoded,'utf8'));assert.equal(db.prepare('SELECT count(*) AS n FROM account_tokens').get().n,1);assert.equal(db.prepare('SELECT count(*) AS n FROM admin_mfa_recovery').get().n,1);assert.equal(db.prepare("SELECT notes,total FROM quotes WHERE id='recover-quote'").get().total,12345);assert.equal(db.prepare("SELECT notes FROM quotes WHERE id='recover-quote'").get().notes,'PRIVATE_RECOVERY_NOTE');assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count,1);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM admin_mfa').get().count,1);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1)}finally{db.close()}
 const rejected=spawnSync(process.execPath,['scripts/db-recovery.mjs','drill','--file',encrypted,'--key-file',keyFile,'--remote'],{encoding:'utf8',env});assert.notEqual(rejected.status,0)
 // Verify failed authentication cannot reach Wrangler (isolated stub would leave a marker).
 const sandbox=join(temp,'sandbox');mkdirSync(join(sandbox,'node_modules/wrangler/bin'),{recursive:true});writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"require('node:fs').writeFileSync('EXECUTED','bad')")
 const remoteOutput=join(temp,'operator-backups'),argumentFile=join(temp,'export-args.json')
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"const fs=require('node:fs'),a=process.argv.slice(2);fs.writeFileSync(process.env.FIXTURE_ARGS,JSON.stringify(a));fs.copyFileSync(process.env.FIXTURE_SQL,a[a.indexOf('--output')+1]);console.log('PRIVATE_PROVIDER_LOG')")
 const backup=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'backup','--remote','--key-file',keyFile,'--output-dir',remoteOutput],{cwd:sandbox,encoding:'utf8',env:{...env,FIXTURE_SQL:sql,FIXTURE_ARGS:argumentFile}});assert.equal(backup.status,0);assert.ok(!backup.stdout.includes('PRIVATE_PROVIDER_LOG'));assert.ok(!backup.stdout.includes('PRIVATE_RECOVERY_CLIENT'));const exportedArgs=JSON.parse(readFileSync(argumentFile,'utf8'));assert.deepEqual(exportedArgs.slice(0,5),['d1','export','quoter-db','--remote','--skip-confirmation']);const files=readdirSync(remoteOutput);assert.equal(files.length,1);assert.ok(files[0].endsWith('.qdb'));const operatorDecoded=join(temp,'operator.sql');await decryptSnapshot(join(remoteOutput,files[0]),operatorDecoded,key);assert.deepEqual(readFileSync(operatorDecoded),readFileSync(sql))
 // A large import's per-statement JSON must not hit spawnSync's output cap.
 // A broken deployment config must not be loaded by an isolated drill.
 writeFileSync(join(sandbox,'wrangler.json'),'INVALID_PRODUCTION_CONFIG')
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),`
 const fs=require('node:fs'),assert=require('node:assert/strict'),a=process.argv.slice(2),path=require('node:path');
 assert.ok(a.includes('--local'));assert.ok(!a.includes('--remote'));
 const config=JSON.parse(fs.readFileSync(a[a.indexOf('--config')+1],'utf8'));
 assert.equal(config.d1_databases[0].database_id,'00000000-0000-0000-0000-000000000000');assert.equal(config.assets,undefined);assert.equal(config.vars,undefined);
 assert.equal(process.cwd(),path.dirname(a[a.indexOf('--config')+1]));
 if(a.includes('--file'))process.stdout.write('PRIVATE_PROVIDER_LOG'.repeat(150000));
 else console.log(JSON.stringify([{results:[{quick_check:'ok'}]},{results:[]},{results:[{applied:1}]},{results:[{guards:3}]}]));
 `)
 const large=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'drill','--file',encrypted,'--key-file',keyFile],{cwd:sandbox,encoding:'utf8',env});assert.equal(large.status,0,large.stderr);assert.ok(large.stdout.includes('Ensayo aprobado'));assert.ok(!large.stdout.includes('PRIVATE_PROVIDER_LOG'))
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"console.log(JSON.stringify({error:{text:'PRIVATE_CUSTOMER PRIVATE_TOKEN INSERT INTO private: FOREIGN KEY constraint failed'}}));process.exitCode=1")
 const failure=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'drill','--file',encrypted,'--key-file',keyFile],{cwd:sandbox,encoding:'utf8',env});assert.notEqual(failure.status,0);assert.ok(failure.stderr.includes('etapa=import, categoria=foreign_key'));assert.ok(!failure.stderr.includes('PRIVATE_CUSTOMER'));assert.ok(!failure.stderr.includes('PRIVATE_TOKEN'))
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"require('node:fs').writeFileSync('EXECUTED','bad')")
 const wrong=join(temp,'wrong-key');writeFileSync(wrong,randomBytes(32).toString('hex'));const invalid=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'drill','--file',encrypted,'--key-file',wrong],{cwd:sandbox,encoding:'utf8',env});assert.notEqual(invalid.status,0);assert.ok(!invalid.stdout.includes('Ensayo aprobado'));assert.ok(!existsSync(join(sandbox,'EXECUTED')))
 assert.ok(!readFileSync(encrypted).includes(Buffer.from('test-digest')))
 console.log('Recovery passed: actual D1 export/import, SQL-limit fallback, complete 400 KB logo/branding, replacement plan/API upgrading an old snapshot to a fresh D1, no binding changes and revoked restored credentials, integrity/FK/guards, preserved credentials/MFA/quotes, remote/wrong-key rejection, isolated config, large-output import and private diagnostics. All fixtures removed.')
}finally{rmSync(temp,{recursive:true,force:true})}
