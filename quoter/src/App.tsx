import { useEffect, useState } from 'react'
import Overview from './pages/Overview'
import Customers from './pages/Customers'
import QuoteBuilder from './pages/QuoteBuilder'
import QuoteDetails from './pages/QuoteDetails'
import './App.css'
export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const pop = () => setPath(window.location.pathname); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop) }, [])
  function navigate(next: string) { window.history.pushState(null, '', next); setPath(next); window.scrollTo(0, 0) }
  const detail = /^\/quotes\/([^/]+)$/.exec(path)
  return <div className="app"><aside><a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/') }}><span>Q</span>Quoter</a><p className="workspace">Demo Business <small>WORKSPACE</small></p><nav>{[['/', 'Dashboard'], ['/customers', 'Customers'], ['/quotes', 'Quotes']].map(([url, label]) => <a className={url === '/' ? path === '/' ? 'active' : '' : path.startsWith(url) ? 'active' : ''} key={url} href={url} onClick={e => { e.preventDefault(); navigate(url) }}>{label}</a>)}</nav><div className="sidebar-footer">Simple quotes.<br />Better business.</div></aside><main key={path}>{path === '/' || path === '/quotes' ? <Overview dashboard={path === '/'} navigate={navigate} /> : path === '/customers' ? <Customers /> : path === '/quotes/new' ? <QuoteBuilder navigate={navigate} /> : detail ? <QuoteDetails id={detail[1]} /> : <><h1>Page not found</h1><button onClick={() => navigate('/')}>Back to dashboard</button></>}</main></div>
}
