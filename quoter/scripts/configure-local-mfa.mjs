import { readFileSync,writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { privateFile,privateFileIfExists } from './lib/private-file.mjs'
const path='.dev.vars'
const existing=privateFileIfExists(path)?readFileSync(path,'utf8'):''
if(/^\s*MFA_ENCRYPTION_KEY\s*=/m.test(existing)){
 console.log('La configuración local ya contiene MFA_ENCRYPTION_KEY; no se modificó. Reinicia el servidor para usarla.')
}else{
 writeFileSync(path,existing+(existing&&!existing.endsWith('\n')?'\n':'')+'MFA_ENCRYPTION_KEY='+randomBytes(32).toString('hex')+'\n',{mode:0o600})
 console.log('Clave local de cifrado MFA configurada sin mostrar su valor. Conserva este archivo privado y reinicia el servidor.')
}
privateFile(path)
