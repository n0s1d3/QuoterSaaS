import type { CSSProperties } from 'react'
import { useId } from 'react'
import type { Branding } from '../lib/types'
import { quoteTemplates, resolveQuoteTemplate } from '../lib/quote-templates'
import type { QuoteTemplate } from '../lib/quote-templates'
export default function TemplatePicker({brand,value,onChange,disabled=false}:{brand:Branding;value?:QuoteTemplate;onChange:(value:QuoteTemplate)=>void;disabled?:boolean}){
 const group=useId()
 return <fieldset className="template-picker"><legend>Modelo de cotización</legend><div className="template-options">{quoteTemplates.map(template=><label className="template-choice" key={template.id}>
  <input type="radio" name={group} value={template.id} checked={resolveQuoteTemplate(value)===template.id} onChange={()=>onChange(template.id)} disabled={disabled}/>
  <span className={`template-mini template-mini-${template.id}`} aria-hidden="true" style={{'--template-primary':brand.primaryColor,'--template-accent':brand.accentColor} as CSSProperties}>
   <span className="mini-side"/><span className="mini-header">{brand.logo?<img src={brand.logo} alt=""/>:<b>Q</b>}<i/></span><span className="mini-client"/><span className="mini-table"><i/><i/><i/><i/></span><span className="mini-total"/><span className="mini-footer"/>
  </span><strong>{template.name}{template.id==='default'?' · actual':''}</strong><small>{template.description}</small>
 </label>)}</div></fieldset>
}
