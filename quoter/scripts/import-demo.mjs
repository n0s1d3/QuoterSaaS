import { spawnSync } from 'node:child_process'
import { writeFileSync,rmSync,mkdtempSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { tmpdir } from 'node:os'
const email=(process.argv[2]||'').trim().toLowerCase()
if(!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Uso: npm run account:import-demo -- tu@correo.com')
const directory=mkdtempSync(join(tmpdir(),'quoter-import-')),file=join(directory,'import.sql')
try{
 writeFileSync(file,`UPDATE users SET organization_id=(SELECT id FROM organizations WHERE slug='demo') WHERE email='${email}' AND EXISTS(SELECT 1 FROM organizations WHERE slug='demo') AND NOT EXISTS(SELECT 1 FROM users WHERE organization_id=(SELECT id FROM organizations WHERE slug='demo') AND email<>'${email}') AND NOT EXISTS(SELECT 1 FROM customers WHERE organization_id=users.organization_id) AND NOT EXISTS(SELECT 1 FROM catalog_items WHERE organization_id=users.organization_id) AND NOT EXISTS(SELECT 1 FROM quotes WHERE organization_id=users.organization_id); SELECT u.email,o.name,o.slug FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.email='${email}';`)
 const state=process.env.QUOTER_IMPORT_STATE ? ['--persist-to',process.env.QUOTER_IMPORT_STATE] : []
 const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db','--local','--file',file,'--json',...state],{encoding:'utf8'})
 if(result.error)throw result.error
 if(result.status!==0)throw new Error(result.stderr || result.stdout || 'Falló la asignación')
 const record=JSON.parse(result.stdout).flatMap(entry=>entry.results||[]).find(row=>row.email===email)
 if(record?.slug!=='demo')throw new Error('No se asignaron datos: verifica que la cuenta exista, su negocio esté vacío y demo no tenga otro propietario.')
 console.log('Datos demo asignados a tu cuenta. Cierra sesión e inicia nuevamente. No se borró ningún dato.')
}finally{rmSync(directory,{recursive:true,force:true})}
