import { pathToFileURL } from 'node:url'
export async function checkProduction(origin,request=fetch){
 const base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('Indica solo el origen HTTPS público, sin credenciales ni rutas')
 const result=[]
 async function check(name,run){try{await run();result.push({check:name,ok:true})}catch{result.push({check:name,ok:false})}}
 async function get(path){return request(new URL(path,base),{method:'GET',redirect:'manual',credentials:'omit',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)})}
 function require(condition){if(!condition)throw new Error('check failed')}
 await check('página y encabezados',async()=>{const response=await get('/');require(response.status===200&&response.headers.get('content-type')?.includes('text/html'));const csp=response.headers.get('content-security-policy')||'';require(csp.includes("script-src 'self'")&&csp.includes("frame-ancestors 'none'")&&csp.includes("object-src 'none'")&&response.headers.get('x-content-type-options')==='nosniff'&&response.headers.has('strict-transport-security'))})
 await check('disponibilidad D1 y configuración',async()=>{const response=await get('/api/health');require(response.status===200&&(await response.json()).status==='ok'&&response.headers.get('cache-control')?.includes('no-store'))})
 await check('Turnstile público',async()=>{const response=await get('/api/auth/security-options');require(response.status===200);const data=await response.json();require(data.required===true&&typeof data.siteKey==='string'&&data.siteKey.length>0)})
 await check('preview de correo desactivado',async()=>{const response=await get('/api/auth/email-options');require(response.status===200&&(await response.json()).preview===false)})
 for(const path of ['/api/auth/me','/api/quotes','/api/admin/overview'])await check('sin acceso anónimo: '+path,async()=>{const response=await get(path);require(response.status===401&&response.headers.get('cache-control')?.includes('no-store'))})
 return {ok:result.every(row=>row.ok),checks:result}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==4||process.argv[2]!=='--url')throw new Error('Uso: npm run check:production -- --url https://tu-app.workers.dev')
 const report=await checkProduction(process.argv[3]);for(const row of report.checks)console.log(`${row.ok?'OK':'FALLO'}: ${row.check}`);console.log('Solo consultas GET sin credenciales. No valida entrega de correo, pagos ni flujos autenticados.');if(!report.ok)process.exitCode=1
 }catch(error){console.error(error.message);process.exitCode=1}
}
