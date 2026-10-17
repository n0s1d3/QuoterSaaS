import { useEffect, useRef, useState } from 'react'
import type { Branding, QuoteDetail } from '../lib/types'
import { validateLogo } from '../lib/raster'
function sample(brand:Branding):QuoteDetail{
 const issueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const end=new Date(issueDate+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7)
 return {id:'preview',revision:0,quoteNumber:'VISTA-PREVIA',status:'draft',customerName:'Cliente de ejemplo',issueDate,expiryDate:end.toISOString().slice(0,10),customer:{id:'sample',name:'Cliente de ejemplo',company:'Datos de demostración',phone:null,email:null,address:null,taxId:null},subtotal:100000,tax:0,discount:0,total:100000,notes:null,paymentTerms:brand.paymentTerms||null,items:[{description:'Producto o servicio de ejemplo',quantity:2,unitPrice:50000,taxRate:0,lineSubtotal:100000,lineTax:0,lineTotal:100000,unit:'unidad'}]}
}
export default function PdfPreview({brand,quote,onClose}:{brand:Branding;quote?:QuoteDetail;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 const [url,setUrl]=useState(''),[error,setError]=useState('')
 useEffect(()=>{dialog.current?.showModal()},[])
 useEffect(()=>{
  let active=true,objectUrl=''
  void (async()=>{try{
   await validateLogo(brand.logo)
   const {createQuotePdf}=await import('../lib/quote-pdf')
   if(!active)return
   objectUrl=URL.createObjectURL(createQuotePdf(quote||sample(brand),brand).output('blob'))
   setUrl(objectUrl)
  }catch(e){if(active)setError((e as Error).message)}})()
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}
 },[brand,quote])
 return <dialog ref={dialog} className="pdf-preview-dialog" aria-labelledby="pdf-preview-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="pdf-preview-content"><div className="section-heading"><h2 id="pdf-preview-title">Vista previa del PDF</h2><button type="button" className="secondary" onClick={onClose} autoFocus>Cerrar vista previa</button></div>{!quote&&<p>Ejemplo sin guardar. Los datos del cliente y los importes son de demostración.</p>}{error?<p role="alert" className="error">No se pudo generar la vista previa: {error}</p>:url?<><p className="pdf-preview-help">Si tu navegador no muestra el documento, <a href={url} target="_blank" rel="noopener noreferrer">abrir PDF en otra pestaña</a>.</p><iframe src={url} title="Documento PDF de cotización"/></>:<p role="status">Generando vista previa…</p>}</div></dialog>
}
