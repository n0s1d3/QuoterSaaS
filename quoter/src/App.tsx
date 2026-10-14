import { useEffect, useState } from 'react'
import Team from './pages/Team'
import AcceptInvitation from './pages/AcceptInvitation'
import { RoleContext } from './lib/role'
import { EmailTokenPage, VerifyAccount } from './pages/EmailAccount'
import Access from './pages/Access'
import type { Account } from './pages/Access'
import { api,setApiContext } from './lib/api'
import { clearDiagnostics } from './lib/brand-diagnostics'
import Catalog from './pages/Catalog'
import Overview from './pages/Overview'
import BrandSettings from './pages/BrandSettings'
import QuoteBuilder from './pages/QuoteBuilder'
import QuoteDetails from './pages/QuoteDetails'
import './App.css'
export default function App() {
  const [user,setUser]=useState<Account | null>(null)
  function applyUser(next:Account|null){setApiContext(next);setUser(next)}
  const [accountError,setAccountError]=useState('')
  const [businesses,setBusinesses]=useState<{id:string;name:string;role:string}[]>([])
  useEffect(()=>{if(user?.emailVerified)api<{id:string;name:string;role:string}[]>('/businesses').then(setBusinesses).catch(e=>setAccountError(e.message))},[user?.id,user?.organizationId,user?.organizationName,user?.emailVerified])
  async function switchBusiness(id:string){try{const next=await api<Account>('/businesses/switch',{organizationId:id});applyUser(next);clearDiagnostics();navigate('/')}catch(e){setAccountError((e as Error).message)}}
  const [checking,setChecking]=useState(true)
  useEffect(()=>{api<Account>('/auth/me').then(applyUser).catch(()=>{}).finally(()=>setChecking(false));const expired=()=>{applyUser(null);clearDiagnostics()};const contextChanged=()=>{clearDiagnostics();api<Account>('/auth/me').then(u=>{applyUser(u);navigate('/');setAccountError('El negocio cambió en otra pestaña. Se actualizó esta vista.')}).catch(()=>applyUser(null))};const changed=()=>{api<Account>('/auth/me').then(applyUser).catch(e=>setAccountError(e.message))};window.addEventListener('quoter-business-context-changed',contextChanged);window.addEventListener('quoter-business-updated',changed);window.addEventListener('quoter-session-expired',expired);return ()=>{window.removeEventListener('quoter-session-expired',expired);window.removeEventListener('quoter-business-updated',changed);window.removeEventListener('quoter-business-context-changed',contextChanged)}},[])
  async function logout(keepInvitation=false){try{await api('/auth/logout',{});applyUser(null);clearDiagnostics();if(!keepInvitation)navigate('/')}catch(e){setAccountError((e as Error).message)}}
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const pop = () => setPath(window.location.pathname); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop) }, [])
  function navigate(next: string) { window.history.pushState(null, '', next); setPath(next); window.scrollTo(0, 0) }
  const edit = /^\/quotes\/([^/]+)\/edit$/.exec(path)
  const detail = /^\/quotes\/([^/]+)$/.exec(path)
  if(path==='/account/verify'||path==='/account/reset')return <EmailTokenPage key={path} reset={path==='/account/reset'} done={()=>{window.location.assign('/')}}/>
  if(checking)return <div className="access"><p>Comprobando sesión…</p></div>
  if(!user)return <Access signedIn={u=>{applyUser(u);clearDiagnostics();if(path!=='/account/invite')navigate('/')}}/>
  if(!user.emailVerified)return <VerifyAccount user={user} logout={()=>{void logout()}}/>
  if(path==='/account/invite')return <AcceptInvitation user={user} logout={()=>{void logout(true)}} accept={u=>{applyUser(u);clearDiagnostics();navigate('/')}}/>
  return <RoleContext.Provider value={user.role}><div className="app" key={`${user.id}-${user.organizationId}`}><aside><a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/') }}><span>Q</span>Quoter</a><p className="workspace">{user.organizationName} <small>{user.email} · {user.role==='owner'?'Propietario':user.role==='editor'?'Editor':'Solo lectura'}</small></p><label className="business-switch">Negocio<select aria-label="Negocio" value={user.organizationId} onChange={e=>{void switchBusiness(e.target.value)}}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><nav>{[['/', 'Resumen'], ['/catalog', 'Catálogo'], ...(user.role==='owner'?[['/settings', 'Mi negocio'],['/team','Equipo']]:[]), ['/quotes', 'Cotizaciones']].map(([url, label]) => <a className={url === '/' ? path === '/' ? 'active' : '' : path.startsWith(url) ? 'active' : ''} key={url} href={url} onClick={e => { e.preventDefault(); navigate(url) }}>{label}</a>)}</nav><div className="sidebar-footer"><button className="secondary" onClick={()=>{void logout()}}>Cerrar sesión</button>{accountError&&<p role="alert">{accountError}</p>}</div></aside><main key={path} className={path === '/' ? 'dashboard-main' : undefined}>{path === '/' || path === '/quotes' ? <Overview dashboard={path === '/'} navigate={navigate} /> : path === '/catalog' ? <Catalog /> : path === '/team' ? user.role==='owner'?<Team/>:<p>Solo el propietario administra el equipo.</p> : path === '/settings' ? user.role==='owner'?<BrandSettings />:<p>Solo el propietario modifica el negocio.</p> : path === '/quotes/new' ? user.role==='viewer'?<p>Tu permiso es de solo lectura.</p>:<QuoteBuilder navigate={navigate} /> : edit ? user.role==='viewer'?<p>Tu permiso es de solo lectura.</p>:<QuoteBuilder navigate={navigate} quoteId={edit[1]} /> : detail ? <QuoteDetails id={detail[1]} navigate={navigate} /> : <><h1>Page not found</h1><button onClick={() => navigate('/')}>Back to dashboard</button></>}</main></div></RoleContext.Provider>
}
