import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,existsSync,readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import { encryptSnapshot,decryptSnapshot } from '../scripts/lib/recovery.mjs'
const temp=mkdtempSync(join(tmpdir(),'quoter-recovery-smoke-')),sql=join(temp,'source.sql'),encrypted=join(temp,'source.qdb'),keyFile=join(temp,'key'),wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(temp,'wrangler.log')}
const config=join(temp,'wrangler.json');writeFileSync(config,JSON.stringify({name:'recovery-fixture',compatibility_date:'2026-10-01',d1_databases:[{binding:'DB',database_name:'quoter-db',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:resolve('migrations')}]}))
function command(values){if(values[0]===wrangler)values.push('--config',config);const result=spawnSync(process.execPath,values,{encoding:'utf8',env,maxBuffer:1024*1024});assert.equal(result.status,0,'Isolated D1 recovery operation failed: '+result.stderr.slice(0,1000));return result.stdout}
try{
 command([wrangler,'d1','migrations','apply','quoter-db','--local'])
 const fixture="INSERT INTO organizations(id,name,slug) VALUES('recover-org','Recovery fixture','recover-org'); INSERT INTO users(id,organization_id,email,password_hash,password_salt,email_verified_at) VALUES('recover-user','recover-org','recover@example.com','test-digest','test-salt',CURRENT_TIMESTAMP); INSERT INTO memberships(user_id,organization_id,role) VALUES('recover-user','recover-org','owner'); INSERT INTO customers(id,organization_id,name) VALUES('recover-client','recover-org','PRIVATE_RECOVERY_CLIENT'); INSERT INTO quotes(id,organization_id,customer_id,quote_number,issue_date,subtotal,total,notes) VALUES('recover-quote','recover-org','recover-client','Q-0001','2026-10-14',12345,12345,'PRIVATE_RECOVERY_NOTE'); INSERT INTO quote_items(id,quote_id,description,quantity,unit_price,line_subtotal,line_total) VALUES('recover-item','recover-quote','Private fixture service',1,12345,12345,12345); INSERT INTO sessions(token_hash,user_id,organization_id,expires_at) VALUES('fixture-session','recover-user','recover-org',unixepoch()+1000); INSERT INTO admin_mfa(user_id,version,sealed_secret,enabled_at) VALUES('recover-user','fixture-version','ENCRYPTED_FACTOR_FIXTURE',CURRENT_TIMESTAMP);"
 command([wrangler,'d1','execute','quoter-db','--local','--command',fixture,'--json'])
 command([wrangler,'d1','export','quoter-db','--local','--output',sql])
 const key=randomBytes(32);writeFileSync(keyFile,key.toString('hex'),{mode:0o600});await encryptSnapshot(sql,encrypted,key);assert.ok(!readFileSync(encrypted).includes(Buffer.from('PRIVATE_RECOVERY_CLIENT')))
 const output=command(['scripts/db-recovery.mjs','drill','--file',encrypted,'--key-file',keyFile]);assert.ok(output.includes('Ensayo aprobado'))
 const decoded=join(temp,'decoded.sql');await decryptSnapshot(encrypted,decoded,key)
 const db=new DatabaseSync(':memory:');try{db.exec(readFileSync(decoded,'utf8'));assert.equal(db.prepare("SELECT notes,total FROM quotes WHERE id='recover-quote'").get().total,12345);assert.equal(db.prepare("SELECT notes FROM quotes WHERE id='recover-quote'").get().notes,'PRIVATE_RECOVERY_NOTE');assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count,1);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM admin_mfa').get().count,1);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1)}finally{db.close()}
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
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"console.error('PRIVATE_CUSTOMER PRIVATE_TOKEN INSERT INTO private: FOREIGN KEY constraint failed');process.exitCode=1")
 const failure=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'drill','--file',encrypted,'--key-file',keyFile],{cwd:sandbox,encoding:'utf8',env});assert.notEqual(failure.status,0);assert.ok(failure.stderr.includes('etapa=import, categoria=foreign_key'));assert.ok(!failure.stderr.includes('PRIVATE_CUSTOMER'));assert.ok(!failure.stderr.includes('PRIVATE_TOKEN'))
 writeFileSync(join(sandbox,'node_modules/wrangler/bin/wrangler.js'),"require('node:fs').writeFileSync('EXECUTED','bad')")
 const wrong=join(temp,'wrong-key');writeFileSync(wrong,randomBytes(32).toString('hex'));const invalid=spawnSync(process.execPath,[resolve('scripts/db-recovery.mjs'),'drill','--file',encrypted,'--key-file',wrong],{cwd:sandbox,encoding:'utf8',env});assert.notEqual(invalid.status,0);assert.ok(!invalid.stdout.includes('Ensayo aprobado'));assert.ok(!existsSync(join(sandbox,'EXECUTED')))
 assert.ok(!readFileSync(encrypted).includes(Buffer.from('test-digest')))
 console.log('Recovery passed: actual D1 export/import, integrity/FK/guards, preserved credentials/MFA/quotes, remote and wrong-key rejection, isolated config, large-output import and private diagnostics. All fixtures removed.')
}finally{rmSync(temp,{recursive:true,force:true})}
