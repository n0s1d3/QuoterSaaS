let context:{id:string;organizationId:string}|null=null
export function setApiContext(user:{id:string;organizationId:string}|null){context=user}
async function request(path:string,data?:unknown,method='POST'){
 const headers=new Headers()
 if(data!==undefined)headers.set('Content-Type','application/json')
 if(context&&!path.startsWith('/auth/')){headers.set('X-Quoter-User',context.id);if(!path.startsWith('/businesses')&&!path.startsWith('/invitations/'))headers.set('X-Quoter-Business',context.organizationId)}
 const response=await fetch(`/api${path}`,{cache:'no-store',credentials:'same-origin',headers,...(data===undefined?{}:{method,body:JSON.stringify(data)})})
 if(!response.ok){const result=await response.json();if(result.code==='SUBSCRIPTION_EXPIRED')window.dispatchEvent(new Event('quoter-subscription-changed'));if(result.code==='PLAN_LIMIT')window.dispatchEvent(new Event('quoter-usage-changed'));if(response.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('quoter-session-expired'));if(response.status===409&&result.error==='El negocio activo cambió. Recarga antes de continuar')window.dispatchEvent(new Event('quoter-business-context-changed'));throw new Error(result.error||'No se pudo completar la solicitud')}
 if(data!==undefined&&/^\/(quotes|catalog|team|backups|plans|trash|invitations)(?:[/?]|$)/.test(path))window.dispatchEvent(new Event('quoter-usage-changed'))
 return response
}
export async function api<T>(path:string,data?:unknown,method='POST'):Promise<T>{return (await request(path,data,method)).json()}
export async function downloadApi(path:string,filename:string){const blob=await(await request(path)).blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
