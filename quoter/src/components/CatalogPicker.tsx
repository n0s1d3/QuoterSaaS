import { useState } from 'react'
import { usePagedList } from '../lib/use-paged-list'
import type { CatalogItem } from '../lib/types'
import { formatMoney } from '../lib/money'
import { catalogAlert } from '../lib/catalog'
export default function CatalogPicker({ select, disabled }: { select: (item: CatalogItem)=>void; disabled:boolean }) {
 const [search,setSearch]=useState(''),[open,setOpen]=useState(false)
 const list=usePagedList<CatalogItem>('/catalog?active=1&search='+encodeURIComponent(search),open)
 return <details className="catalog-picker" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>+ Elegir del catálogo</summary>{list.error&&<p role="alert" className="error">{list.error}</p>}<label>Buscar producto o servicio<input maxLength={200} type="search" value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="catalog-options">{list.items.map(item=><div key={item.id}><strong>{item.name}</strong><p>{formatMoney(item.unitPrice)} / {item.unit} · {item.category}{item.duration?` · ${item.duration}`:''}</p>{catalogAlert(item)&&<p className="error">{catalogAlert(item)}</p>}<button type="button" disabled={disabled} className="secondary" onClick={()=>select(item)}>Agregar {item.name}</button></div>)}</div>{list.loading&&<p role="status">Cargando partidas…</p>}{!list.loading&&!list.items.length&&<p>{search?'No se encontraron partidas. Prueba otra búsqueda.':'Guarda partidas en la sección Catálogo para reutilizarlas aquí.'}</p>}{!!list.items.length&&<small>{list.items.length} de {list.total} partidas encontradas.</small>}{list.hasMore&&<button type="button" className="secondary" disabled={list.loading} onClick={()=>{void list.loadMore()}}>Cargar más partidas</button>}</details>
}
