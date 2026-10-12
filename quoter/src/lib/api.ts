let context:{id:string;organizationId:string}|null=null
export function setApiContext(user:{id:string;organizationId:string}|null){context=user}
export async function api<T>(path: string, data?: unknown, method = 'POST'): Promise<T> {
  const headers = new Headers()
  if(data!==undefined)headers.set('Content-Type','application/json')
  if(context&&!path.startsWith('/auth/')){
    headers.set('X-Quoter-User',context.id)
    if(!path.startsWith('/businesses')&&!path.startsWith('/invitations/'))headers.set('X-Quoter-Business',context.organizationId)
  }
  const response = await fetch(`/api${path}`, {cache:'no-store',credentials:'same-origin',headers,...(data===undefined?{}:{method,body:JSON.stringify(data)})})
  const result = await response.json()
  if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('quoter-session-expired'))
  if (response.status === 409 && result.error === 'El negocio activo cambió. Recarga antes de continuar') window.dispatchEvent(new Event('quoter-business-context-changed'))
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}
