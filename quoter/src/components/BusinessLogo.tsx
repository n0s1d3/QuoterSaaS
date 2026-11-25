import type {Branding} from '../lib/types'
import {normalizeWebsite} from '../lib/website'
export default function BusinessLogo({brand,onLoad,onError}:{brand:Pick<Branding,'logo'|'website'|'name'>;onLoad?:()=>void;onError?:()=>void}){
 if(!brand.logo)return null
 let website:string|null=null;try{website=normalizeWebsite(brand.website)}catch{/* A malformed legacy URL must not turn into a clickable link. */}
 const image=<img className="business-logo" src={brand.logo} alt="Logo del negocio" onLoad={onLoad} onError={onError}/>
 return website?<a className="business-logo-link" href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visitar sitio web de ${brand.name}`}>{image}</a>:image
}
