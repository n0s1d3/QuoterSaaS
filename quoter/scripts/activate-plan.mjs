import { billingOffer,isBillingMonths } from '../src/lib/billing.ts'
import { spawnSync } from 'node:child_process'
import { writeFileSync,rmSync,mkdtempSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
const args=process.argv.slice(2),options={}
for(let i=0;i<args.length;i++){
 const key=args[i]
 if(key==='--remote'){if(options.remote)throw new Error('Opción repetida');options.remote=true;continue}
 if(!['--business','--plan','--reference','--operator','--months'].includes(key)||options[key]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Uso: npm run plan:activate -- --business ID --plan 1|2|3 --reference REFERENCIA --operator admin@correo.com [--months 1|3|6|12] [--remote]')
 options[key]=args[++i]
}
const business=options['--business'],plan={'1':'gratis','2':'pro','3':'negocio'}[options['--plan']],reference=options['--reference']?.trim(),operator=options['--operator']?.trim().toLowerCase()
if(!business||business.length>100||!plan||!reference||reference.length>200||!operator||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator))throw new Error('Se requieren negocio, plan 1/2/3, referencia única (máx. 200 caracteres) y correo del administrador. Verifica el pago antes de ejecutar.')
const months=options['--months']===undefined?1:Number(options['--months'])
if(!isBillingMonths(months))throw new Error('El periodo debe ser 1, 3, 6 o 12 meses')
const offer=billingOffer(plan,months)
const sql=value=>"'"+value.replaceAll("'","''")+"'"
const directory=mkdtempSync(join(tmpdir(),'quoter-plan-')),file=join(directory,'activation.sql')
try{
 writeFileSync(file,`INSERT INTO plan_activations(id,organization_id,plan_id,payment_reference,operator_email,duration_months,tariff_cents) SELECT ${sql(randomUUID())},id,${sql(plan)},${sql(reference)},${sql(operator)},${months},${offer.totalCents} FROM organizations WHERE id=${sql(business)} ON CONFLICT(payment_reference) DO NOTHING;
 SELECT a.organization_id,a.plan_id,o.name,a.created_at,a.period_end,a.duration_months FROM plan_activations a JOIN organizations o ON o.id=a.organization_id WHERE a.payment_reference=${sql(reference)};`)
 const state=process.env.QUOTER_IMPORT_STATE?['--persist-to',process.env.QUOTER_IMPORT_STATE]:[]
 if(options.remote&&state.length)throw new Error('No se puede combinar --remote con QUOTER_IMPORT_STATE')
 const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','quoter-db',options.remote?'--remote':'--local','--file',file,'--json',...state],{encoding:'utf8'})
 if(result.error)throw result.error
 if(result.status!==0)throw new Error([result.stderr,result.stdout].filter(Boolean).join('\n')||'Falló la activación')
 const record=JSON.parse(result.stdout).flatMap(entry=>entry.results||[]).find(row=>row.organization_id)
 if(!record)throw new Error('El negocio no existe. No se activó ningún plan.')
 if(record.organization_id!==business||record.plan_id!==plan||record.duration_months!==months)throw new Error('La referencia ya se utilizó para otro negocio, plan o periodo. No se realizó ningún cambio.')
 console.log(`${options.remote?'REMOTO':'LOCAL'}: pago registrado para ${record.name}, Plan ${options['--plan']}, ${months} meses (${record.created_at}), vigencia registrada hasta ${record.period_end?new Date(record.period_end*1000).toLocaleString('es-GT',{timeZone:'America/Guatemala'}):'fecha histórica no disponible'}. Repetir la misma referencia no genera otra activación. No se procesó ningún cobro.`)
}finally{rmSync(directory,{recursive:true,force:true})}
