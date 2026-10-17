import { existsSync,readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve,join } from 'node:path'
import { tmpdir } from 'node:os'
import { privateFile } from './lib/private-file.mjs'

const args=process.argv.slice(2),initialize=args.length===1&&args[0]==='--initialize'
if(args.length&&!initialize)throw new Error('Usa sin argumentos para comprobar, o --initialize exclusivamente para la primera configuración')
const file='.env.password-pepper.production.local',wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),temp=mkdtempSync(join(tmpdir(),'quoter-pepper-'))
function command(values,input){
 const result=spawnSync(process.execPath,[wrangler,...values],{input,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(temp,'wrangler.log'),WRANGLER_LOG_SANITIZE:'true'}})
 if(result.error||result.status!==0)throw new Error('No se pudo comprobar/configurar el secreto remoto. Revisa autenticación y configuración de Wrangler; no se muestran sus respuestas privadas')
 return result.stdout
}
try{
 // Only names are inspected. Cloudflare does not return the remote secret.
 let secrets
 try{secrets=JSON.parse(command(['secret','list']))}catch{throw new Error('No se pudieron comprobar los nombres de secretos remotos; no se modificó PASSWORD_PEPPER')}
 if(!Array.isArray(secrets))throw new Error('Respuesta de metadatos inesperada; no se modificó el secreto')
 const present=secrets.some(secret=>secret?.name==='PASSWORD_PEPPER')
 let key
 if(existsSync(file)){
  privateFile(file);key=readFileSync(file,'utf8').trim()
  if(!/^[a-f0-9]{64}$/i.test(key))throw new Error('El archivo privado de PASSWORD_PEPPER no es válido; no se sobrescribió')
 }
 if(present){
  if(initialize)throw new Error('PASSWORD_PEPPER ya existe: se rechazó su reemplazo. Recupera la clave original; este comando no rota secretos')
  if(!key)throw new Error('PASSWORD_PEPPER remoto existe, pero falta su copia local. No se generó ni subió otra clave; recupera la original de tu custodia segura')
  console.log('PASSWORD_PEPPER remoto y copia local presentes; no se subió ni reemplazó ninguna clave. Esta comprobación de presencia no demuestra que sus valores coincidan.')
 }else{
  if(!initialize)throw new Error('PASSWORD_PEPPER remoto no existe. La primera configuración exige --initialize explícito; no se creó ninguna clave')
  if(!key){key=randomBytes(32).toString('hex');writeFileSync(file,key+'\n',{flag:'wx',mode:0o600});privateFile(file)}
  command(['secret','put','PASSWORD_PEPPER'],key)
  console.log('PASSWORD_PEPPER inicializado sin mostrar su valor. Conserva .env.password-pepper.production.local en custodia segura; futuros comandos nunca lo reemplazan.')
 }
}finally{rmSync(temp,{recursive:true,force:true,maxRetries:5})}
