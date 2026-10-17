import { useEffect,useState } from 'react'
import { api } from '../lib/api'
import { usePagedList } from '../lib/use-paged-list'
import type { Customer } from '../lib/types'
export default function CustomerPicker({value,onChange,disabled=false,'aria-label':label='Cliente'}:{value:string;onChange:(id:string)=>void;disabled?:boolean;'aria-label'?:string}) {
 const [search,setSearch]=useState(''),[lookup,setLookup]=useState<{id:string;customer:Customer|null;error:string}|null>(null)
 const list=usePagedList<Customer>('/customers?search='+encodeURIComponent(search))
 useEffect(()=>{
  const controller=new AbortController()
  if(value!=='new')api<Customer>('/customers?id='+encodeURIComponent(value),undefined,'GET',{signal:controller.signal}).then(customer=>{if(!controller.signal.aborted)setLookup({id:value,customer,error:''})}).catch(error=>{if(!controller.signal.aborted)setLookup({id:value,customer:null,error:(error as Error).message})})
  return ()=>controller.abort()
 },[value])
 const selected=lookup?.id===value?lookup.customer:null,lookupError=lookup?.id===value?lookup.error:''
 const options=selected?.id===value&&!list.items.some(customer=>customer.id===value)?[selected,...list.items]:list.items
 return <div className="customer-picker"><label>Buscar cliente<input aria-label="Buscar cliente" type="search" maxLength={200} value={search} disabled={disabled} onChange={event=>setSearch(event.target.value)} placeholder="Nombre, empresa o correo"/></label><label>{label}<select aria-label={label} disabled={disabled} value={value} onChange={event=>onChange(event.target.value)}><option value="new">+ Nuevo cliente</option>{value!=='new'&&!options.some(customer=>customer.id===value)&&<option value={value}>Cliente seleccionado{lookupError?'':' (cargando…)'} </option>}{options.map(customer=><option key={customer.id} value={customer.id}>{customer.name}{customer.company?' · '+customer.company:''}</option>)}</select></label>{list.loading&&<small role="status">Cargando clientes…</small>}{!list.loading&&<small>{list.items.length} de {list.total} clientes encontrados.</small>}{list.hasMore&&<button type="button" className="secondary" disabled={disabled||list.loading} onClick={()=>{void list.loadMore()}}>Cargar más clientes</button>}{(lookupError||list.error)&&<p role="alert" className="error">{lookupError||list.error}</p>}</div>
}
