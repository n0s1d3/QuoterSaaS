import { readFileSync,writeFileSync,existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const path='.dev.vars',existing=existsSync(path)?readFileSync(path,'utf8'):''
if(/^\s*PASSWORD_PEPPER\s*=/m.test(existing)){console.log('PASSWORD_PEPPER local ya está configurado; no se modificó.')}else{writeFileSync(path,existing+(existing&&!existing.endsWith('\n')?'\n':'')+'PASSWORD_PEPPER='+randomBytes(32).toString('hex')+'\n',{mode:0o600});console.log('PASSWORD_PEPPER local configurado sin mostrar su valor. Conserva este archivo privado y reinicia el servidor.')}
