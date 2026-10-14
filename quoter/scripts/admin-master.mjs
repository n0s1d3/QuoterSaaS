import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
const args=process.argv.slice(2),options={}
for(let i=0;i<args.length;i++){
 const key=args[i]
 if(key==='--remote'){if(options.remote)throw new Error('Opción repetida');options.remote=true;continue}
 if(key!=='--email'||options.email!==undefined||!args[i+1])throw new Error('Uso: npm run admin:master -- --email tu@correo.com [--remote]')
 options.email=args[++i].trim().toLowerCase()
}
if(!options.email||options.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email))throw new Error('Indica un correo válido. Su propietario deberá verificarlo antes de administrar.')
const literal=value=>"'"+value.replaceAll("'","''")+"'",email=literal(options.email),state=process.env.QUOTER_IMPORT_STATE?['--persist-to',process.env.QUOTER_IMPORT_STATE]:[]
if(options.remote&&state.length)throw new Error('No combines --remote con QUOTER_IMPORT_STATE')
const sql=`DELETE FROM sessions WHERE user_id IN (SELECT u.id FROM users u JOIN platform_admin p ON p.email=u.email WHERE p.email<>${email});
 INSERT INTO platform_admin(id,email) VALUES(1,${email}) ON CONFLICT(id) DO UPDATE SET email=excluded.email,configured_at=CURRENT_TIMESTAMP;
 INSERT INTO platform_audit(id,action,target_type,target_id) VALUES('${randomUUID()}','master.configured','platform','master');
 SELECT u.id,(u.email_verified_at IS NOT NULL AND u.suspended_at IS NULL) AS ready FROM platform_admin p LEFT JOIN users u ON u.email=p.email WHERE p.id=1;`
const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db',options.remote?'--remote':'--local','--command',sql,'--json',...state],{encoding:'utf8'})
if(result.error)throw result.error
if(result.status!==0)throw new Error([result.stderr,result.stdout].filter(Boolean).join('\n')||'Falló la configuración administrativa')
const record=JSON.parse(result.stdout).flatMap(entry=>entry.results||[]).find(row=>'ready' in row)
console.log(`${options.remote?'REMOTO':'LOCAL'}: correo maestro configurado. ${record?.ready?'La cuenta verificada ya puede administrar; recarga la app.':'Registra y verifica esa cuenta para obtener acceso. Si está desactivada, un operador de la base deberá reactivarla.'} No se creó ninguna contraseña ni se concedió acceso al contenido privado de otros negocios.`)
