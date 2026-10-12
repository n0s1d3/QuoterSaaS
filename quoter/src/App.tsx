import { useEffect, useState } from 'react'
import { EmailTokenPage, VerifyAccount } from './pages/EmailAccount'
import Access from './pages/Access'
import type { Account } from './pages/Access'
import { api } from './lib/api'
import { clearDiagnostics } from './lib/brand-diagnostics'
import Catalog from './pages/Catalog'
import Overview from './pages/Overview'
import BrandSettings from './pages/BrandSettings'
import QuoteBuilder from './pages/QuoteBuilder'
import QuoteDetails from './pages/QuoteDetails'
import './App.css'
export default function App() {
  const [user,setUser]=useState<Account | null>(null)
  const [checking,setChecking]=useState(true)
  const [accountError,setAccountError]=useState('')
  useEffect(()=>{api<Account>('/auth/me').then(setUser).catch(()=>{}).finally(()=>setChecking(false));const expired=()=>{setUser(null);clearDiagnostics()};window.addEventListener('quoter-session-expired',expired);return ()=>window.removeEventListener('quoter-session-expired',expired)},[])
  async function logout(){try{await api('/auth/logout',{});setUser(null);clearDiagnostics();navigate('/')}catch(e){setAccountError((e as Error).message)}}
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const pop = () => setPath(window.location.pathname); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop) }, [])
  function navigate(next: string) { window.history.pushState(null, '', next); setPath(next); window.scrollTo(0, 0) }
  const edit = /^\/quotes\/([^/]+)\/edit$/.exec(path)
  const detail = /^\/quotes\/([^/]+)$/.exec(path)
  if(path==='/account/verify'||path==='/account/reset')return <EmailTokenPage key={path} reset={path==='/account/reset'} done={()=>{window.location.assign('/')}}/>
  if(checking)return <div className="access"><p>Comprobando sesión…</p></div>
  if(!user)return <Access signedIn={u=>{setUser(u);clearDiagnostics();navigate('/')}}/>
  if(!user.emailVerified)return <VerifyAccount user={user} logout={()=>{void logout()}}/>
  return <div className="app" key={user.id}><aside><a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/') }}><span>Q</span>Quoter</a><p className="workspace">{user.organizationName} <small>{user.email}</small></p><nav>{[['/', 'Resumen'], ['/catalog', 'Catálogo'], ['/settings', 'Mi negocio'], ['/quotes', 'Cotizaciones']].map(([url, label]) => <a className={url === '/' ? path === '/' ? 'active' : '' : path.startsWith(url) ? 'active' : ''} key={url} href={url} onClick={e => { e.preventDefault(); navigate(url) }}>{label}</a>)}</nav><div className="sidebar-footer"><button className="secondary" onClick={()=>{void logout()}}>Cerrar sesión</button>{accountError&&<p role="alert">{accountError}</p>}</div></aside><main key={path}>{path === '/' || path === '/quotes' ? <Overview dashboard={path === '/'} navigate={navigate} /> : path === '/catalog' ? <Catalog /> : path === '/settings' ? <BrandSettings /> : path === '/quotes/new' ? <QuoteBuilder navigate={navigate} /> : edit ? <QuoteBuilder navigate={navigate} quoteId={edit[1]} /> : detail ? <QuoteDetails id={detail[1]} navigate={navigate} /> : <><h1>Page not found</h1><button onClick={() => navigate('/')}>Back to dashboard</button></>}</main></div>
}
