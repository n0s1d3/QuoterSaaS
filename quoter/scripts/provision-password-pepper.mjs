import { existsSync,readFileSync,writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const file='.env.password-pepper.production.local'
if(!existsSync(file))writeFileSync(file,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600})
const key=readFileSync(file,'utf8').trim()
if(!/^[a-f0-9]{64}$/i.test(key))throw new Error('El archivo privado de PASSWORD_PEPPER no es válido; no se sobrescribió')
console.log('Se guardará PASSWORD_PEPPER en el Worker configurado. Su valor no se muestra y se conserva para futuras ejecuciones.')
const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'secret','put','PASSWORD_PEPPER'],{input:key,stdio:['pipe','inherit','inherit']})
if(result.error)throw result.error
if(result.status!==0)process.exit(result.status||1)
console.log('Conserva el archivo privado .env.password-pepper.production.local y respáldalo de forma segura. No lo publiques ni lo borres.')
