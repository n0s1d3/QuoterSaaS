import {useEffect,useRef,useState} from 'react'
import {normalizeProductImage} from '../lib/product-image-upload'
export default function ProductImageField({value,onChange,onBusyChange,label='Imagen del producto',disabled=false}:{value?:string|null;onChange:(image:string|null)=>void;onBusyChange?:(busy:boolean)=>void;label?:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 async function read(file?:File){if(!file)return;setBusy(true);setError('');onBusyChange?.(true);try{const image=await normalizeProductImage(file);if(mounted.current)onChange(image)}catch(e){if(mounted.current)setError((e as Error).message+' La imagen anterior se conserva.')}finally{if(mounted.current)setBusy(false);onBusyChange?.(false)}}
 return <div className="product-image-field"><label>{label}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||busy} onChange={e=>{const input=e.currentTarget;void read(input.files?.[0]).finally(()=>{input.value=''})}}/></label><small>Una imagen opcional. PNG, JPEG o WebP hasta 10 MB; se optimiza para la cotización y el PDF.</small>{busy&&<p role="status">Optimizando imagen…</p>}{error&&<p className="error" role="alert">{error}</p>}{value&&<div className="product-image-preview"><img src={value} alt="Imagen del producto"/><button type="button" className="subtle" disabled={disabled||busy} onClick={()=>{onChange(null);setError('')}}>Quitar imagen</button></div>}</div>
}
