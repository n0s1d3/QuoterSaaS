import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { subscriptionDate } from '../lib/subscription'

interface Status { enabled:boolean; verified:boolean; configured:boolean; verifiedUntil:number|null }

export default function AdminMfa({ children }: { children:ReactNode }) {
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [password,setPassword]=useState(''),[code,setCode]=useState(''),[durationDays,setDurationDays]=useState(0),[changing,setChanging]=useState(false)
 const [setup,setSetup]=useState<{secret:string;uri:string}|null>(null),[recovery,setRecovery]=useState<string[]>([])
 async function reload(){try{setStatus(await api<Status>('/security/admin-mfa'));setError('')}catch(e){setError((e as Error).message)}}
 useEffect(()=>{
  let active=true
  const check=()=>api<Status>('/security/admin-mfa').then(value=>{if(active){setStatus(value);setError('')}}).catch(e=>{if(active)setError(e.message)})
  void check();const timer=setInterval(()=>{void check()},30000)
  return()=>{active=false;clearInterval(timer)}
 },[])
 async function submit(action:string){
  setBusy(true);setError('')
  try{
   const result=await api<{secret?:string;uri?:string;recoveryCodes?:string[]}>('/security/admin-mfa',{action,currentPassword:password,code,durationDays})
   setCode('')
   if(result.secret&&result.uri)setSetup({secret:result.secret,uri:result.uri})
   else{setPassword('');setSetup(null);setChanging(false);if(result.recoveryCodes)setRecovery(result.recoveryCodes);await reload()}
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 if(status?.verified&&!recovery.length&&!changing)return <>
  <div className="mfa-session-summary"><span>Acceso 2FA hasta {subscriptionDate(status.verifiedUntil)}</span><button type="button" className="secondary" onClick={()=>{setCode('');setError('');setChanging(true)}}>Cambiar duración 2FA</button></div>
  {children}
 </>
 return <>
  <div className="page-heading"><div><p className="eyebrow">CUENTA MAESTRA</p><h1>Protege Administración</h1></div></div>
  <section className="panel mfa-panel">
   {error&&<p role="alert" className="error">{error}</p>}
   {!status?<p>Comprobando segundo factor…</p>:recovery.length?<>
    <h2>Guarda tus códigos de recuperación</h2><p>Cada código permite entrar una sola vez si pierdes tu autenticador. Guárdalos en un lugar privado y seguro; no vuelven a mostrarse.</p>
    <ul>{recovery.map(value=><li key={value}><code style={{overflowWrap:'anywhere'}}>{value}</code></li>)}</ul>
    <button onClick={()=>setRecovery([])}>Ya guardé los códigos</button>
   </>:!status.configured?<p>El servidor necesita configurar la protección del segundo factor antes de abrir Administración. Consulta al responsable de la instalación.</p>:<form onSubmit={e=>{e.preventDefault();void submit(status.enabled?'verify':setup?'confirm':'setup')}}>
    <p>{status.enabled?'Ingresa un código nuevo de tu aplicación autenticadora o uno de tus códigos de recuperación. Elige cuánto tiempo conservar este acceso en el navegador.':'Activa el segundo factor para entrar al panel maestro. Las demás cuentas no cambian.'}</p>
    {!status.enabled&&<label>Contraseña actual<input required type="password" autoComplete="current-password" maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}
    {setup&&<>
     <p>En tu autenticador, agrega una cuenta con clave de configuración manual: Quoter, código basado en tiempo. Esta configuración vence en 20 minutos.</p>
     <p><code style={{overflowWrap:'anywhere'}}>{setup.secret}</code></p><p><a href={setup.uri}>Abrir aplicación autenticadora</a></p>
     <p>No compartas esta clave. Confirma con el código de seis dígitos que muestra tu autenticador.</p>
    </>}
    {(status.enabled||setup)&&<>
     <label>Código de autenticación o recuperación<input required autoComplete="one-time-code" spellCheck={false} maxLength={32} value={code} onChange={e=>setCode(e.target.value.trim())} disabled={busy}/></label>
     <label>Duración del acceso 2FA<select value={durationDays} onChange={e=>setDurationDays(Number(e.target.value))} disabled={busy}><option value={0}>Una hora</option><option value={90}>90 días · equipo personal</option><option value={180}>180 días · equipo personal</option></select></label>
     <p className="hint">90 o 180 días también mantienen abierta tu sesión en este navegador. Usa esta opción en un equipo personal. Cerrar sesión, borrar las cookies, restablecer la contraseña o desactivar la cuenta termina el acceso. Los códigos del autenticador siguen cambiando cada 30 segundos.</p>
    </>}
    <div className="detail-actions"><button disabled={busy}>{busy?'Verificando…':status.enabled?'Verificar acceso':setup?'Confirmar segundo factor':'Configurar autenticador'}</button>{status.verified&&changing&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setChanging(false);setCode('');setError('')}}>Cancelar</button>}</div>
   </form>}
  </section>
 </>
}
