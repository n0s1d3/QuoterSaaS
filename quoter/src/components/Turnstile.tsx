import { useEffect,useRef } from 'react'
interface TurnstileApi {render(element:HTMLElement,options:Record<string,unknown>):string;remove(id:string):void}
declare global {interface Window {turnstile?:TurnstileApi}}
let scriptPromise:Promise<void>|null=null
function load(){if(window.turnstile)return Promise.resolve();if(!scriptPromise){scriptPromise=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error('No se pudo cargar la verificación de seguridad'));document.head.appendChild(script)}).catch(e=>{scriptPromise=null;throw e})}return scriptPromise}
export default function Turnstile({siteKey,action,onToken}:{siteKey:string;action:string;onToken:(token:string)=>void}){
 const root=useRef<HTMLDivElement>(null),callback=useRef(onToken);useEffect(()=>{callback.current=onToken},[onToken])
 useEffect(()=>{let active=true,id:string|undefined;load().then(()=>{if(active&&root.current)id=window.turnstile!.render(root.current,{sitekey:siteKey,action,size:'compact',theme:'dark',callback:(token:string)=>callback.current(token),'expired-callback':()=>callback.current(''),'error-callback':()=>callback.current('')})}).catch(()=>{if(active&&root.current)root.current.textContent='No se pudo cargar la verificación. Recarga la página para intentarlo nuevamente.'});return()=>{active=false;if(id)window.turnstile?.remove(id)}},[siteKey,action])
 return <div ref={root} aria-label="Verificación de seguridad" style={{minHeight:140}}/>
}
