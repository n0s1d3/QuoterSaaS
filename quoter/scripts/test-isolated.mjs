import { spawn } from 'node:child_process'
import { mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'

const project=fileURLToPath(new URL('../',import.meta.url)),temp=mkdtempSync(join(tmpdir(),'quoter-tests-'))
const state=join(temp,'state'),config=join(temp,'wrangler.json'),wrangler=join(project,'node_modules/wrangler/bin/wrangler.js')
const tests=['auth-smoke','email-smoke','api-smoke','business-smoke','data-smoke','customer-import-smoke','plans-smoke','activation-smoke','subscription-smoke','security-smoke','platform-admin-smoke','mfa-smoke','browser-smoke','subscription-browser','backup-roundtrip-smoke','editor-browser','trash-purge-smoke','request-context-smoke','hardening-smoke','templates-smoke','billing-smoke']
const selected=process.argv.slice(2);if(selected.some(name=>!tests.includes(name)))throw new Error('Prueba no reconocida')
const suite=selected.length?selected:tests
const env={...process.env,XDG_CONFIG_HOME:join(temp,'config'),WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(temp,'wrangler.log'),QUOTER_IMPORT_STATE:state,QUOTER_TEST_CONFIG:config,QUOTER_ADMIN_ISOLATED:'1'}
mkdirSync(env.XDG_CONFIG_HOME,{mode:0o700})
for(const name of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','CLOUDFLARE_ACCOUNT_ID','WRANGLER_API_TOKEN'])delete env[name]
// All operator commands resolve the temporary config, even if a test omits --config.
for(const name of ['node_modules','scripts','tests','migrations','dist'])symlinkSync(join(project,name),join(temp,name),process.platform==='win32'?'junction':'dir')
if(!env.QUOTER_BROWSER_PATH&&existsSync('/usr/bin/chromium'))env.QUOTER_BROWSER_PATH='/usr/bin/chromium'
const port=await new Promise((done,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const selectedPort=probe.address().port;probe.close(()=>done(selectedPort))})})
env.QUOTER_TEST_URL=`http://127.0.0.1:${port}`
writeFileSync(config,JSON.stringify({name:'quoter-tests',main:join(project,'dist/quoter/index.js'),compatibility_date:'2026-10-06',assets:{directory:join(project,'dist/client'),not_found_handling:'single-page-application'},d1_databases:[{binding:'DB',database_name:'quoter-db',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:join(project,'migrations')}],vars:{EMAIL_MODE:'preview',PASSWORD_PEPPER:randomBytes(32).toString('hex'),MFA_ENCRYPTION_KEY:randomBytes(32).toString('hex')}}),{mode:0o600})
let server,serverLog='',active,startupError
function command(args,extra={}){return new Promise((done,reject)=>{
 const child=spawn(process.execPath,args,{cwd:temp,env:{...env,...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});active=child;let output=''
 const collect=data=>{output=(output+data.toString()).slice(-65536)};child.stdout.on('data',collect);child.stderr.on('data',collect)
 const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('La prueba superó cuatro minutos'))},240000)
 child.once('error',error=>{clearTimeout(timer);active=undefined;reject(error)})
 child.once('exit',code=>{clearTimeout(timer);active=undefined;if(code===0)done(output);else reject(new Error(`Falló una comprobación aislada (${code}):\n${output.slice(-6000)}`))})
})}
const interrupted=()=>{active?.kill('SIGTERM');server?.kill('SIGINT')};process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted)
try{
 if(!existsSync(join(project,'dist/quoter/index.js')))throw new Error('Compila primero: npm run build')
 await command([wrangler,'d1','migrations','apply','quoter-db','--local','--config',config,'--persist-to',state])
 server=spawn(process.execPath,[wrangler,'dev','--local','--config',config,'--persist-to',state,'--ip','127.0.0.1','--port',String(port),'--log-level','error'],{cwd:temp,env,windowsHide:true,stdio:['ignore','pipe','pipe']})
 server.once('error',error=>{startupError=error})
 const collect=data=>{serverLog=(serverLog+data.toString()).slice(-8192)};server.stdout.on('data',collect);server.stderr.on('data',collect)
 const deadline=Date.now()+45000
 while(true){
  if(startupError||server.exitCode!==null)throw new Error('No inició el servidor temporal: '+(startupError?.message||serverLog))
  try{const response=await fetch(env.QUOTER_TEST_URL+'/api/health',{signal:AbortSignal.timeout(1000)});if(response.ok)break}catch{/* Wait only for this local server. */}
  if(Date.now()>deadline)throw new Error('El servidor temporal no está listo: '+serverLog)
  await new Promise(done=>setTimeout(done,200))
 }
 for(let index=0;index<suite.length;index++){
  const name=suite[index],output=await command([join(project,'tests',name+'.mjs')],{QUOTER_TEST_IP:`198.51.100.${index+10}`})
  console.log('OK '+name+': '+(output.trim().split('\n').findLast(line=>/passed|passed:|Subscriptions passed|Auth passed|Security passed|MFA passed/i.test(line))||'completada'))
 }
 console.log(`${suite.length} suites aprobadas en D1 temporal. No se utilizó la base habitual ni producción.`)
}catch(error){console.error(error.message);process.exitCode=1}
finally{
 active?.kill('SIGTERM')
 if(server&&server.exitCode===null){await new Promise(done=>{const timer=setTimeout(()=>{server.kill('SIGKILL');done()},5000);server.once('exit',()=>{clearTimeout(timer);done()});server.kill('SIGINT')})}
 process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted)
 rmSync(temp,{recursive:true,force:true,maxRetries:5})
}
