import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Account } from '../pages/Access'
import AppIcon, { type AppIconName } from './AppIcon'
function closeDisclosures(root: HTMLElement | null, target?: Node) {
  root?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { if(!target || !menu.contains(target)) menu.open = false })
}
export default function AppShell({ user, businesses, path, navigate, switchBusiness, logout, error, children }: {
  user: Account; businesses: {id:string;name:string;role:string}[]; path:string; navigate:(path:string)=>void;
  switchBusiness:(id:string)=>Promise<void>; logout:()=>void; error:string; children:ReactNode;
}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches)
  const shell = useRef<HTMLDivElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const role = user.role === 'owner' ? 'Propietario' : user.role === 'editor' ? 'Editor' : 'Solo lectura'
  const initials = user.email.slice(0, 2).toUpperCase()
  const links: {url:string;label:string;icon:AppIconName}[] = [
    {url:'/',label:'Resumen',icon:'dashboard'}, {url:'/quotes',label:'Cotizaciones',icon:'quotes'}, {url:'/catalog',label:'Catálogo',icon:'catalog'},
    ...(user.role === 'owner' ? [{url:'/team',label:'Equipo',icon:'team' as const}, {url:'/settings',label:'Mi negocio',icon:'business' as const}, {url:'/data',label:'Datos y recuperación',icon:'catalog' as const}] : []),
  ]
  useEffect(() => { const media = window.matchMedia('(max-width: 700px)'); const change = () => {setMobile(media.matches);setMenuOpen(false)}; media.addEventListener('change',change); return () => media.removeEventListener('change',change) }, [])
  useEffect(() => { if(!menuOpen || !mobile) return; const trigger = menuButton.current; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; sidebar.current?.querySelector<HTMLButtonElement>('.mobile-nav-close')?.focus(); return () => {document.body.style.overflow = overflow;trigger?.focus()} }, [menuOpen,mobile])
  useEffect(() => {
    const outside = (event:PointerEvent) => {
      if (!(event.target instanceof Node)) return
      closeDisclosures(shell.current, event.target)
      if (!sidebar.current?.contains(event.target) && !menuButton.current?.contains(event.target)) { setMenuOpen(false); setCollapsed(true) }
    }
    const escape = (event:KeyboardEvent) => {
      if(event.key !== 'Escape') return
      const focused = document.activeElement?.closest<HTMLDetailsElement>('details[open]')
      closeDisclosures(shell.current)
      focused?.querySelector<HTMLElement>('summary')?.focus()
      setMenuOpen(false); setCollapsed(true)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', escape)}
  }, [])
  function go(url:string) { setMenuOpen(false); closeDisclosures(shell.current); navigate(url) }
  function toggleMenu() { if(mobile) setMenuOpen(!menuOpen); else setCollapsed(!collapsed) }
  return <div ref={shell} className={`app app-shell${menuOpen ? ' nav-open' : ''}${collapsed ? ' nav-collapsed' : ''}`}>
    {menuOpen && <button type="button" className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}/>}
    <aside ref={sidebar} id="app-navigation" aria-label="Menú principal" inert={mobile && !menuOpen}><a className="brand" href="/" onClick={e => {e.preventDefault();go('/')}}><span>Q</span><b>Quoter</b></a><button type="button" className="mobile-nav-close icon-button" aria-label="Cerrar menú lateral" onClick={() => setMenuOpen(false)}><AppIcon name="close"/></button>
      <div className="workspace"><p className="sidebar-caption">ESPACIO DE TRABAJO</p><strong>{user.organizationName}</strong><small>{role}</small></div>
      <label className="business-switch">Negocio<select aria-label="Negocio" value={user.organizationId} onChange={e => {setMenuOpen(false);void switchBusiness(e.target.value)}}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <p className="sidebar-caption nav-caption">PRINCIPAL</p><nav>{links.map(link => <a key={link.url} href={link.url} title={link.label} className={(link.url === '/' ? path === '/' : path.startsWith(link.url)) ? 'active' : ''} aria-current={(link.url === '/' ? path === '/' : path.startsWith(link.url)) ? 'page' : undefined} onClick={e => {e.preventDefault();go(link.url)}}><AppIcon name={link.icon}/><span>{link.label}</span></a>)}</nav>
      <div className="sidebar-footer"><div className="sidebar-note"><span className="connection-dot"/>Tu negocio, organizado.</div></div>
    </aside>
    <div className="app-workspace" inert={mobile && menuOpen}><header className="topbar"><button ref={menuButton} type="button" className="icon-button menu-toggle" aria-label="Alternar menú lateral" aria-controls="app-navigation" aria-expanded={mobile ? menuOpen : !collapsed} onClick={toggleMenu}><AppIcon name="menu"/></button>
      <form className="header-search" role="search" onSubmit={e => {e.preventDefault();go(`/quotes?search=${encodeURIComponent(search.trim())}`)}}><AppIcon name="search"/><input aria-label="Buscar cotizaciones" type="search" placeholder="Buscar cliente o cotización…" maxLength={200} value={search} onChange={e => setSearch(e.target.value)}/><button type="submit">Buscar</button></form>
      <details className="user-menu"><summary aria-label="Menú de usuario"><span className="user-avatar">{initials}</span><span className="user-menu-label">{user.email.split('@')[0]}<small>{role}</small></span><AppIcon name="chevron"/></summary><div className="user-menu-popover"><strong>Tu cuenta</strong><p>{user.email}</p><small>{user.organizationName} · {role}</small><button className="secondary" type="button" onClick={logout}><AppIcon name="logout"/>Cerrar sesión</button></div></details>
    </header>{error && <p className="error shell-error" role="alert">{error}</p>}{children}</div>
  </div>
}
