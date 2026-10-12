import { useEffect,useState } from 'react'
import { api } from '../lib/api'
import type { Account } from './Access'
export default function AcceptInvitation({accept,user,logout}:{accept:(user:Account)=>void;user:Account;logout:()=>void}){
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [invitation,setInvitation]=useState<{businessName:string;role:string}|null>(null)
 useEffect(()=>{if(token)api<{businessName:string;role:string}>('/invitations/preview',{token}).then(setInvitation).catch(e=>setError(e.message))},[token])
 async function join(){setBusy(true);try{accept(await api<Account>('/invitations/accept',{token}));window.history.replaceState(null,'','/')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="access"><section className="panel"><h1>Unirte al equipo</h1><p>Cuenta actual: {user.email}</p><h2>{invitation?.businessName || "Comprobando invitación…"}</h2>{invitation&&<p>Permiso: {invitation.role==='editor'?'Editor':'Solo lectura'}</p>}<p>Aceptar agrega este negocio a tu cuenta. Tu negocio actual y sus datos se conservan.</p>{error&&<p role="alert" className="error">{error}</p>}<button disabled={busy||!token||!invitation} onClick={()=>{void join()}}>{busy?'Aceptando…':'Aceptar invitación'}</button><p>Si no verificaste tu correo todavía, verifica tu cuenta y vuelve a abrir esta invitación.</p><button className="secondary" onClick={logout}>Usar otra cuenta</button><a href="/">Volver al inicio</a></section></div>
}
