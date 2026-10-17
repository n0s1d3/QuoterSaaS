import SubscriptionProvider from './components/SubscriptionProvider'
import WriteAccess from './components/WriteAccess'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import PageErrorBoundary from './components/PageErrorBoundary'
import { confirmNavigation } from './lib/navigation-guard'
import { RoleContext } from './lib/role'
import type { Account } from './pages/Access'
import { api,setApiContext } from './lib/api'
import { clearDiagnostics } from './lib/brand-diagnostics'
import AppShell from './components/AppShell'
import './App.css'
const AdminMfa = lazy(() => import('./pages/AdminMfa'))
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'))
const PlanSettings = lazy(() => import('./pages/PlanSettings'))
const DataSettings = lazy(() => import('./pages/DataSettings'))
const Team = lazy(() => import('./pages/Team'))
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'))
const Access = lazy(() => import('./pages/Access'))
const Catalog = lazy(() => import('./pages/Catalog'))
const Overview = lazy(() => import('./pages/Overview'))
const BrandSettings = lazy(() => import('./pages/BrandSettings'))
const QuoteBuilder = lazy(() => import('./pages/QuoteBuilder'))
const QuoteDetails = lazy(() => import('./pages/QuoteDetails'))
const EmailTokenPage = lazy(() => import('./pages/EmailAccount').then(module => ({ default: module.EmailTokenPage })))
const VerifyAccount = lazy(() => import('./pages/EmailAccount').then(module => ({ default: module.VerifyAccount })))
function LoadingPage(){return <p role="status">Cargando página…</p>}
export default function App(){return <PageErrorBoundary><Suspense fallback={<LoadingPage/>}><Application/></Suspense></PageErrorBoundary>}
function Application() {
  const [user,setUser]=useState<Account | null>(null)
  function applyUser(next:Account|null){setApiContext(next);setUser(next)}
  const [accountError,setAccountError]=useState('')
  const [businesses,setBusinesses]=useState<{id:string;name:string;role:string}[]>([])
  useEffect(()=>{if(user?.emailVerified)api<{id:string;name:string;role:string}[]>('/businesses').then(setBusinesses).catch(e=>setAccountError(e.message))},[user?.id,user?.organizationId,user?.organizationName,user?.emailVerified])
  async function switchBusiness(id:string){if(id===user?.organizationId||!confirmNavigation())return;try{const next=await api<Account>('/businesses/switch',{organizationId:id});applyUser(next);clearDiagnostics();navigate(next.isPlatformAdmin?'/admin':'/',true)}catch(e){setAccountError((e as Error).message)}}
  const [checking,setChecking]=useState(true)
  useEffect(()=>{api<Account>('/auth/me').then(applyUser).catch(()=>{}).finally(()=>setChecking(false));const expired=()=>{applyUser(null);clearDiagnostics()};const contextChanged=()=>{clearDiagnostics();api<Account>('/auth/me').then(u=>{if(!confirmNavigation()){setAccountError('El negocio cambió en otra pestaña. Copia tus cambios pendientes antes de salir; este formulario ya no puede guardarse en el contexto anterior.');return}applyUser(u);navigate(u.isPlatformAdmin?'/admin':'/',true);setAccountError('El negocio cambió en otra pestaña. Se actualizó esta vista.')}).catch(()=>applyUser(null))};const changed=()=>{api<Account>('/auth/me').then(applyUser).catch(e=>setAccountError(e.message))};window.addEventListener('quoter-business-context-changed',contextChanged);window.addEventListener('quoter-business-updated',changed);window.addEventListener('quoter-session-expired',expired);return ()=>{window.removeEventListener('quoter-session-expired',expired);window.removeEventListener('quoter-business-updated',changed);window.removeEventListener('quoter-business-context-changed',contextChanged)}},[])
  async function logout(keepInvitation=false){if(!confirmNavigation())return;try{await api('/auth/logout',{});applyUser(null);clearDiagnostics();if(!keepInvitation)navigate('/',true)}catch(e){setAccountError((e as Error).message)}}
  const [location, setLocation] = useState(window.location.pathname + window.location.search)
  const path = location.split('?')[0]
  const entry = useRef({url: window.location.pathname + window.location.search, index: Number.isInteger(window.history.state?.quoterIndex) ? window.history.state.quoterIndex : 0})
  const restoring = useRef(false)
  useEffect(() => {
    window.history.replaceState({...window.history.state, quoterIndex: entry.current.index}, '', entry.current.url)
    const pop = () => {
      if(restoring.current){restoring.current=false;return}
      const next = window.location.pathname + window.location.search
      const index = Number.isInteger(window.history.state?.quoterIndex) ? window.history.state.quoterIndex : entry.current.index - 1
      if(!confirmNavigation()){
        const distance=entry.current.index-index
        if(distance){restoring.current=true;window.history.go(distance)}
        else window.history.replaceState({...window.history.state,quoterIndex:entry.current.index},'',entry.current.url)
        return
      }
      entry.current={url:next,index};setLocation(next)
    }
    window.addEventListener('popstate',pop)
    return ()=>window.removeEventListener('popstate',pop)
  }, [])
  function navigate(next: string, confirmed=false) {
    if(next===entry.current.url)return
    if(!confirmed&&!confirmNavigation())return
    const index=entry.current.index+1
    window.history.pushState({quoterIndex:index}, '', next)
    entry.current={url:window.location.pathname+window.location.search,index};setLocation(entry.current.url);window.scrollTo(0,0)
  }
  useEffect(()=>{
    const titles:Record<string,string>={'/':'Resumen','/overview':'Resumen','/quotes':'Cotizaciones','/catalog':'Catálogo','/plan':'Plan y uso','/data':'Datos y recuperación','/team':'Equipo','/settings':'Mi negocio','/admin':'Administración','/quotes/new':'Nueva cotización','/account/verify':'Verificar correo','/account/reset':'Restablecer contraseña','/account/invite':'Invitación'}
    document.title=`${titles[path]||(/^\/quotes\/[^/]+\/edit$/.test(path)?'Editar cotización':/^\/quotes\/[^/]+$/.test(path)?'Cotización':'Quoter')} · Quoter`
    let focused=false
    const focus=()=>{const heading=document.querySelector<HTMLElement>('main h1');if(heading&&!focused){focused=true;heading.tabIndex=-1;heading.focus({preventScroll:true});observer.disconnect()}}
    const observer=new MutationObserver(focus);observer.observe(document.body,{childList:true,subtree:true});focus()
    return ()=>observer.disconnect()
  },[location,path,user?.id])
  useEffect(()=>{if(user?.isPlatformAdmin&&path==='/')navigate('/admin')},[user?.isPlatformAdmin,path])
  const edit = /^\/quotes\/([^/]+)\/edit$/.exec(path)
  const detail = /^\/quotes\/([^/]+)$/.exec(path)
  if(path==='/account/verify'||path==='/account/reset')return <EmailTokenPage key={path} reset={path==='/account/reset'} done={()=>{window.location.assign('/')}}/>
  if(checking)return <div className="access"><p>Comprobando sesión…</p></div>
  if(!user)return <Access signedIn={u=>{applyUser(u);clearDiagnostics();if(path!=='/account/invite')navigate(u.isPlatformAdmin?'/admin':'/')}}/>
  if(!user.emailVerified)return <VerifyAccount user={user} logout={()=>{void logout()}}/>
  if(path==='/account/invite')return <AcceptInvitation user={user} logout={()=>{void logout(true)}} accept={u=>{applyUser(u);clearDiagnostics();navigate(u.isPlatformAdmin?'/admin':'/')}}/>
  return <RoleContext.Provider value={user.role}><AppShell key={`${user.id}-${user.organizationId}`} user={user} businesses={businesses} path={path} navigate={navigate} switchBusiness={switchBusiness} logout={()=>{void logout()}} error={accountError}><SubscriptionProvider key={`${user.id}-${user.organizationId}`} path={path} owner={user.role==='owner'} navigate={navigate}><main key={location} id="main-content" tabIndex={-1} className={path === '/' || path === '/overview' ? 'dashboard-main' : undefined}><PageErrorBoundary key={location}><Suspense fallback={<LoadingPage/>}>{path === '/admin' ? user.isPlatformAdmin?<AdminMfa><PlatformAdmin/></AdminMfa>:<p>Acceso exclusivo de la cuenta maestra.</p> : path === '/' || path === '/overview' || path === '/quotes' ? <Overview dashboard={path === '/' || path === '/overview'} navigate={navigate} /> : path === '/catalog' ? <Catalog /> : path === '/plan' ? user.role==='owner'?<PlanSettings/>:<p>Solo el propietario administra el plan.</p> : path === '/data' ? user.role==='owner'?<DataSettings/>:<p>Solo el propietario administra los datos.</p> : path === '/team' ? user.role==='owner'?<Team/>:<p>Solo el propietario administra el equipo.</p> : path === '/settings' ? user.role==='owner'?<BrandSettings />:<p>Solo el propietario modifica el negocio.</p> : path === '/quotes/new' ? user.role==='viewer'?<p>Tu permiso es de solo lectura.</p>:<WriteAccess><QuoteBuilder navigate={navigate} /></WriteAccess> : edit ? user.role==='viewer'?<p>Tu permiso es de solo lectura.</p>:<WriteAccess><QuoteBuilder navigate={navigate} quoteId={edit[1]} /></WriteAccess> : detail ? <QuoteDetails id={detail[1]} navigate={navigate} /> : <><h1>Página no encontrada</h1><button onClick={() => navigate('/')}>Volver al resumen</button></>}</Suspense></PageErrorBoundary></main></SubscriptionProvider></AppShell></RoleContext.Provider>
}
