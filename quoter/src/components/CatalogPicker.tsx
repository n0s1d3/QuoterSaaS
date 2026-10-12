import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { CatalogItem } from '../lib/types'
import { formatMoney } from '../lib/money'
import { catalogAlert } from '../lib/catalog'
export default function CatalogPicker({ select, disabled }: { select: (item: CatalogItem)=>void; disabled:boolean }) {
 const [items,setItems]=useState<CatalogItem[]>([]),[search,setSearch]=useState(''),[error,setError]=useState('')
 useEffect(()=>{api<CatalogItem[]>('/catalog').then(setItems).catch(e=>setError(e.message))},[])
 return <details className="catalog-picker"><summary>+ Elegir del catálogo</summary>{error&&<p className="error">{error}</p>}<label>Buscar producto o servicio<input value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="catalog-options">{items.filter(i=>i.active&&`${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase())).map(item=><div key={item.id}><strong>{item.name}</strong><p>{formatMoney(item.unitPrice)} / {item.unit} · {item.category}{item.duration?` · ${item.duration}`:''}</p>{catalogAlert(item)&&<p className="error">{catalogAlert(item)}</p>}<button type="button" disabled={disabled} className="secondary" onClick={()=>select(item)}>Agregar {item.name}</button></div>)}</div>{!items.some(i=>i.active)&&<p>Guarda partidas en la sección Catálogo para reutilizarlas aquí.</p>}</details>
}
