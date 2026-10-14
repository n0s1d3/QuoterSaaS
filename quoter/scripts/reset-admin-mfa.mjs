import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const args=process.argv.slice(2),remote=args.includes('--remote'),index=args.indexOf('--email'),email=index>=0?args[index+1]?.trim().toLowerCase():null
if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||args.length!==(remote?3:2)||args.some((a,i)=>i!==index+1&&!['--email','--remote'].includes(a)))throw new Error('Uso: npm run admin:reset-mfa -- --email correo-maestro [--remote]')
const state=process.env.QUOTER_IMPORT_STATE?['--persist-to',process.env.QUOTER_IMPORT_STATE]:[];if(remote&&state.length)throw new Error('No combines --remote con un estado local')
const literal="'"+email.replaceAll("'","''")+"'"
const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db',remote?'--remote':'--local',...state,'--command',`DELETE FROM admin_mfa WHERE user_id IN(SELECT u.id FROM users u JOIN platform_admin p ON p.email=u.email WHERE u.email=${literal})`,'--json'],{encoding:'utf8'})
if(result.error)throw result.error;if(result.status!==0)throw new Error('No fue posible restablecer el segundo factor; comprueba la base y los permisos del operador')
const changes=JSON.parse(result.stdout).some(entry=>entry.meta?.changes>0)
console.log(changes?'Segundo factor restablecido; las sesiones fueron revocadas. Inicia sesión y registra un nuevo autenticador.':'No se cambió ningún factor; comprueba la designación de la cuenta maestra.')
